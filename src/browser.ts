export function visibility(listener?: (visibility: boolean) => void): boolean {
  const props = {
    hidden: 'visibilitychange',
    webkitHidden: 'webkitvisibilitychange',
    mozHidden: 'mozvisibilitychange',
    msHidden: 'msvisibilitychange'
  };

  let eventKey: string | undefined; 
  let stateKey: string | undefined;
  
  for (stateKey in props) {
    if (stateKey in document) {
      eventKey = props[stateKey];
      break;
    }
  }

  if (listener && eventKey) {
    document.addEventListener(eventKey, (event) => {
      listener(!event.target[stateKey!]);
    });
  }

  return !document[stateKey!];
}

export function keyEventToString(event: KeyboardEvent): string {
  let result = '';

  let append = (flag: boolean, name: string, buffer: string): string => buffer.length ? buffer + (flag ? ' ' + name : '') : (flag ? name : '');

  result = append(event.metaKey, 'META', result);
  result = append(event.ctrlKey, 'CTRL', result);
  result = append(event.altKey, 'ALT', result);
  result = append(event.shiftKey, 'SHIFT', result);

  let char = String.fromCharCode(event.keyCode);
  if (char) {
    result += (result.length ? ' ' : '') + char.toLowerCase();
  }

  return result;
}
