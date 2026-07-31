export function getVolumeIcon(): string {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path class="dwar-volume-icon__speaker" d="M4 9v6h4l5 4V5L8 9H4Z" />
      <path class="dwar-volume-icon__wave dwar-volume-icon__wave--low" d="M16 9.25a4 4 0 0 1 0 5.5" />
      <path class="dwar-volume-icon__wave dwar-volume-icon__wave--high" d="M18.75 6.5a7.75 7.75 0 0 1 0 11" />
      <path class="dwar-volume-icon__mute" d="m16.5 9 5 5m0-5-5 5" />
    </svg>
  `;
}
