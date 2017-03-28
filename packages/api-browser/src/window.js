import {
  addAccessibleWindow,
  removeAccessibleWindow
} from './accessible-windows';

let currentWindow = null;

class Window {
  constructor(...args) {
    if (args.length === 0) {
      this.innerWindow = window;
    } else {
      const [url, name, features] = args;

      this.innerWindow = window.open(url, name, objectToFeaturesString(features));
      this.innerWindow.onclose = () => {
        removeAccessibleWindow(this.innerWindow.name);
      };

      addAccessibleWindow(name, this.innerWindow);
    }
  }

  close() {
    // Close only works on windows that were opened by the current window
    if (this.innerWindow) {
      this.innerWindow.close();
    }
  }

  show() {
    // Unable to 'show' browser window
  }

  hide() {
    // Unable to 'hide' browser window
  }

  focus() {
    if (this.innerWindow) {
      this.innerWindow.focus();
    }
  }

  blur() {
    if (this.innerWindow) {
      this.innerWindow.blur();
    }
  }

  static getCurrentWindowId() {
    return window.name;
  };

  static getCurrentWindow() {
    if (currentWindow) {
      return currentWindow;
    }

    currentWindow = new Window();
    return currentWindow;
  }
}

const objectToFeaturesString = (features) => {
  return Object.keys(features).map((key) => {
    let value = features[key];

    // Need to convert booleans to yes/no
    if (value === true) {
      value = 'yes';
    } else if (value === false) {
      value = 'no';
    }

    return `${key}=${value}`;
  }).join(',');
};

export default Window;
