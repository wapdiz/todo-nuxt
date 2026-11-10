import debounce from 'lodash.debounce';
import { UAParser } from 'ua-parser-js';

const linuxOS = [
  'fedora',
  'debian',
  'gentoo',
  'linpus',
  'mageia',
  'mandriva',
  'meego',
  'mint',
  'pclinuxos',
  'redhat',
  'sailfish',
  'slackware',
  'suse',
  'tizen',
  'ubuntu',
  'vectorlinux',
];

let parserResult = null;
let classesArray: string[] = [];

const addClass = (key: string, value: string) => {
  value = value.toString().toLowerCase().replace(/[\s.]/g, '-');

  classesArray.push(`is-${key}-${value}`);
};

const init = () => {
  parserResult = new UAParser().getResult();

  if (classesArray.length) {
    document.documentElement.classList.remove(...classesArray);

    classesArray = [];
  }

  if (parserResult.browser.name) {
    addClass('browser', parserResult.browser.name);
  }

  if (parserResult.os.name && linuxOS.indexOf(parserResult.os.name.toLowerCase()) >= 0) {
    addClass('os', 'linux');
  }

  if (parserResult.os.name) {
    addClass('os', parserResult.os.name);
  }

  document.documentElement.classList.add(...classesArray);
};

const resize = debounce(init, 200);

export default {
  init,
  resize,
};
