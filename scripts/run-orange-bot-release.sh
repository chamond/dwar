#!/usr/bin/env bash
# Runs on the Ubuntu server; receives no Telegram token from the client.
set -euo pipefail
deploy_dir=$1
mode=$2
cd "$deploy_dir"
umask 077

valid_staging() {
  local staging_name=${staging_dir#"$deploy_dir"/}
  [[ "$staging_dir" == "$deploy_dir/$staging_name" && "$staging_name" =~ ^\.incoming\.[a-zA-Z0-9]{6}$ ]]
}
# Clean the upload even when preflight or acquiring the activation lock fails.
if [[ "$mode" == deploy ]]; then
  staging_dir=$4
  valid_staging || { echo 'Некорректный путь загрузки.' >&2; exit 1; }
  trap 'rm -rf -- "$staging_dir"' EXIT
fi

# One activation at a time, including loading the uploaded image and rollback.
exec 9>.deploy.lock
flock -n 9 || { echo 'Другой деплой уже выполняется.' >&2; exit 1; }
[[ -s .env ]] || { echo "Отсутствует $deploy_dir/.env с BOT_TOKEN." >&2; exit 1; }
docker info >/dev/null
docker compose version >/dev/null
chmod 600 .env

case "$mode" in
  deploy)
    next_image=$3
    staging_dir=$4
    ;;
  rollback)
    [[ -s .previous-image && -s .previous-compose.yml ]] || {
      echo 'Предыдущего успешного релиза для отката нет.' >&2; exit 1;
    }
    next_image=$(cat .previous-image)
    staging_dir=$(mktemp -d "$deploy_dir/.incoming.XXXXXX")
    cp .previous-compose.yml "$staging_dir/docker-compose.yml"
    ;;
  *) echo 'Неизвестная операция релиза.' >&2; exit 1 ;;
esac
valid_staging || {
  echo 'Некорректный путь загрузки.' >&2; exit 1;
}
activation_started=false
compose_changed=false
release_saved=false
cleanup() {
  local status=$?
  trap - EXIT INT TERM HUP
  if $activation_started && ! $release_saved; then
    restore_previous
  elif $compose_changed && ! $release_saved && [[ -f "$staging_dir/old-compose.yml" ]]; then
    cp "$staging_dir/old-compose.yml" docker-compose.yml
  fi
  rm -rf -- "$staging_dir"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP
[[ "$next_image" =~ ^orange-telegram-bot:[a-zA-Z0-9_.-]+$ ]] || {
  echo 'Некорректное имя образа.' >&2; exit 1;
}
if [[ "$mode" == deploy ]]; then
  docker image load --input "$staging_dir/image.tar.gz"
fi
docker image inspect "$next_image" >/dev/null

previous_image=''
container_id=$(docker ps --all --quiet --filter label=com.docker.compose.project=orange-bot --filter label=com.docker.compose.service=orange-bot)
if [[ -n "$container_id" ]]; then
  previous_image=$(docker inspect --format '{{.Config.Image}}' "$container_id")
  [[ -f docker-compose.yml ]] || { echo 'У текущего контейнера отсутствует Compose-файл.' >&2; exit 1; }
  cp docker-compose.yml "$staging_dir/old-compose.yml"
fi

active_image=$next_image
compose() {
  ORANGE_BOT_IMAGE="$active_image" docker compose --project-name orange-bot --env-file .env --file docker-compose.yml "$@"
}
check_started() {
  local candidate_id snapshot attempt
  candidate_id=$(compose ps --all --quiet orange-bot) || return 1
  [[ -n "$candidate_id" ]] || return 1
  # No HTTP endpoint: check that the process stays up for 15 seconds without restarting.
  for ((attempt = 0; attempt < 15; attempt++)); do
    snapshot=$(docker inspect --format '{{.State.Running}} {{.RestartCount}}' "$candidate_id") || return 1
    [[ "$snapshot" == 'true 0' ]] || return 1
    sleep 1
  done
}
restore_previous() {
  if [[ -n "$previous_image" ]]; then
    cp "$staging_dir/old-compose.yml" docker-compose.yml
    active_image=$previous_image
    if compose up --detach --no-build --pull never --force-recreate orange-bot && check_started; then
      echo "Восстановлен предыдущий образ: $previous_image" >&2
    else
      echo 'Не удалось восстановить предыдущий контейнер. Проверьте сервер.' >&2
    fi
  else
    compose stop orange-bot || true
    echo 'Первый запуск не удался; контейнер остановлен.' >&2
  fi
}

cp "$staging_dir/docker-compose.yml" docker-compose.yml
compose_changed=true
if ! compose config --quiet; then
  exit 1
fi
echo "Запуск $next_image..."
activation_started=true
if ! compose up --detach --no-build --pull never --force-recreate orange-bot || ! check_started; then
  echo 'Контейнер не прошёл проверку запуска.' >&2
  compose logs --tail 30 orange-bot >&2 || true
  exit 1
fi

if [[ -n "$previous_image" ]]; then
  printf '%s\n' "$previous_image" > .previous-image
  cp "$staging_dir/old-compose.yml" .previous-compose.yml
fi
printf 'ORANGE_BOT_IMAGE=%s\n' "$next_image" > .release.env.tmp
mv .release.env.tmp .release.env
release_saved=true
echo "Готово: $next_image. SQLite сохранена в volume orange-bot_orange-data."
