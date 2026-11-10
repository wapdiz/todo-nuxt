import InAppSpy from 'inapp-spy';

const { isInApp } = InAppSpy();

const openUrl = (url: string) => {
  if (isInApp) {
    (window.Telegram as any).WebApp.openLink(url);
  } else {
    window.open(url, '_blank');
  }
};

export default openUrl;
