export type VisibilityListener = (visibility: boolean) => void;
export class VisibilityMonitor {
  constructor(private listener: VisibilityListener) {
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

    if (eventKey) {
      document.addEventListener(eventKey, (event) => {
        this.listener(!event.target[stateKey]);
      });
    }
  }
}
