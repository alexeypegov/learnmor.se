export function visibility(listener?: (visibility: boolean) => void): boolean {
  const props = {
    hidden: 'visibilitychange',
    webkitHidden: 'webkitvisibilitychange',
    mozHidden: 'mozvisibilitychange',
    msHidden: 'msvisibilitychange'
  };

  let eventKey: string, stateKey: string;
  for (stateKey in props) {
    if (stateKey in document) {
      eventKey = props[stateKey];
      break;
    }
  }

  if (listener && eventKey) {
    document.addEventListener(eventKey, (event) => {
      listener(!event.target[stateKey]);
    });
  }

  return !document[stateKey];
}
