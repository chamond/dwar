export interface CheckboxOptionElements {
  label: HTMLLabelElement;
  checkbox: HTMLInputElement;
}

export interface CheckboxOptionOptions {
  text: string;
  title?: string | undefined;
  initialChecked?: boolean | undefined;
}

export function createCheckboxOption(
  options: CheckboxOptionOptions
): CheckboxOptionElements {
  const label = document.createElement('label');
  label.className = 'dwar-option-checkbox';

  if (options.title !== undefined) {
    label.title = options.title;
  }

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'dwar-option-checkbox__input';
  checkbox.checked = options.initialChecked ?? false;

  const text = document.createElement('span');
  text.className = 'dwar-option-checkbox__label';
  text.textContent = options.text;

  label.append(checkbox, text);

  return {
    label,
    checkbox
  };
}
