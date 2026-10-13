#!/usr/bin/env bash
set -euo pipefail

repo_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
app_dir="$repo_dir/orange-telegram-bot"
remote_script="$repo_dir/scripts/run-orange-bot-release.sh"
deploy_ssh=${ORANGE_DEPLOY_SSH:-root@157.228.143.85}
deploy_dir=${ORANGE_DEPLOY_DIR:-/var/www/orange-bot}

case "${1:-}" in
  --help)
    cat <<'HELP'
Usage: npm run deploy:orange [-- --help]
       npm run rollback:orange

Defaults: root@157.228.143.85, /var/www/orange-bot.
Override with ORANGE_DEPLOY_SSH and ORANGE_DEPLOY_DIR.
SSH keys, port and aliases are configured in ~/.ssh/config.
Create .env with BOT_TOKEN on the server before the first deployment.
HELP
    exit 0
    ;;
  ''|--rollback) ;;
  *) echo "Неизвестный аргумент: $1" >&2; exit 1 ;;
esac
[[ $# -le 1 ]] || { echo 'Слишком много аргументов.' >&2; exit 1; }
[[ "$deploy_ssh" =~ ^[a-zA-Z0-9][a-zA-Z0-9_.@-]*$ ]] || {
  echo 'ORANGE_DEPLOY_SSH должен быть SSH-алиасом или user@host.' >&2; exit 1;
}
[[ "$deploy_dir" =~ ^/[a-zA-Z0-9_./-]+$ && "$deploy_dir" != / && "$deploy_dir" != */../* && "$deploy_dir" != */.. ]] || {
  echo 'ORANGE_DEPLOY_DIR должен быть абсолютным путём без пробелов и ..' >&2; exit 1;
}
command -v ssh >/dev/null
ssh_options=(-o ConnectTimeout=15 -o ServerAliveInterval=15 -o ServerAliveCountMax=3)

if [[ "${1:-}" == --rollback ]]; then
  ssh "${ssh_options[@]}" "$deploy_ssh" "bash -s -- '$deploy_dir' rollback" < "$remote_script"
  exit 0
fi

for tool in docker scp gzip; do command -v "$tool" >/dev/null; done
docker info >/dev/null
docker compose --project-directory "$app_dir" --env-file "$app_dir/.env.example" config --quiet

echo "Проверка сервера $deploy_ssh..."
platform=$(ssh "${ssh_options[@]}" "$deploy_ssh" "bash -s -- '$deploy_dir'" <<'PREFLIGHT'
set -euo pipefail
command -v flock >/dev/null
docker info >/dev/null
docker compose version >/dev/null
mkdir -p "$1"
if [[ ! -s "$1/.env" ]]; then
  echo "Создайте $1/.env на сервере и задайте BOT_TOKEN (см. README)." >&2
  exit 1
fi
case "$(uname -m)" in
  x86_64) echo linux/amd64 ;;
  aarch64|arm64) echo linux/arm64 ;;
  *) echo 'Поддерживаются серверы amd64 и arm64.' >&2; exit 1 ;;
esac
PREFLIGHT
)
[[ "$platform" == linux/amd64 || "$platform" == linux/arm64 ]] || {
  echo 'Не удалось определить архитектуру сервера.' >&2; exit 1;
}

revision=$(git -C "$repo_dir" rev-parse --short HEAD 2>/dev/null || echo unversioned)
image="orange-telegram-bot:$(date -u +%Y%m%dT%H%M%SZ)-$revision-$$"
echo "Сборка $image для $platform..."
if docker buildx version >/dev/null 2>&1; then
  docker buildx build --platform "$platform" --load --tag "$image" --file "$app_dir/dockerfile" "$app_dir"
else
  local_platform=$(docker version --format '{{.Server.Os}}/{{.Server.Arch}}')
  if [[ "$local_platform" != "$platform" ]]; then
    echo "Buildx отсутствует: Docker работает на $local_platform, сервер — на $platform." >&2
    echo 'Для сборки под другую архитектуру установите Buildx на компьютере запуска деплоя:' >&2
    echo 'https://docs.docker.com/build/buildx/' >&2
    exit 1
  fi
  echo 'Buildx отсутствует; сборка через docker build для той же архитектуры.'
  DOCKER_BUILDKIT=0 docker build --platform "$platform" --tag "$image" --file "$app_dir/dockerfile" "$app_dir"
fi

archive_dir=$(mktemp -d)
staging_dir=''
remote_owns_staging=false
cleanup() {
  rm -rf "$archive_dir"
  if [[ -n "$staging_dir" ]] && ! $remote_owns_staging; then
    ssh "${ssh_options[@]}" "$deploy_ssh" "rm -rf -- '$staging_dir'" </dev/null || true
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

echo 'Упаковка и передача образа...'
docker image save "$image" | gzip > "$archive_dir/image.tar.gz"
staging_dir=$(ssh "${ssh_options[@]}" "$deploy_ssh" "mktemp -d '$deploy_dir/.incoming.XXXXXX'")
staging_name=${staging_dir#"$deploy_dir"/}
if [[ "$staging_dir" != "$deploy_dir/$staging_name" || ! "$staging_name" =~ ^\.incoming\.[a-zA-Z0-9]{6}$ ]]; then
  staging_dir=''
  echo 'Сервер вернул некорректный путь загрузки.' >&2
  exit 1
fi
scp "${ssh_options[@]}" "$archive_dir/image.tar.gz" "$app_dir/docker-compose.yml" "$deploy_ssh:$staging_dir/"
# The server now owns cleanup: never delete its rollback files while it is restoring a release.
remote_owns_staging=true
ssh "${ssh_options[@]}" "$deploy_ssh" "bash -s -- '$deploy_dir' deploy '$image' '$staging_dir'" < "$remote_script"
