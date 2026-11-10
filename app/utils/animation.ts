import { gsap } from 'gsap';

interface IAnimation {
  beforeEnter: (el: Element) => void;
  beforeEnterOpacity: (el: Element) => void;
  enter: (el: Element) => void;
  leave: (el: Element, done: () => void) => void;
  leaveOpacity: (el: Element, done: () => void) => void;
}

const animation: IAnimation = {
  beforeEnter: (el: Element) => {
    gsap.set(el, { yPercent: -75 });
  },

  beforeEnterOpacity: (el: Element) => {
    gsap.set(el, { autoAlpha: 0 });
  },

  enter: (el: Element) => {
    gsap.to(el, {
      delay: 0.5,
      duration: 1,
      autoAlpha: 1,
      ease: 'power4.out',
    });
  },

  leave: (el: Element, done: () => void) => {
    gsap.to(el, {
      duration: 1,
      yPercent: 50,
      autoAlpha: 0,
      ease: 'power2.inOut',
      onComplete: done,
    });
  },

  leaveOpacity: (el: Element, done: () => void) => {
    gsap.to(el, {
      duration: 1,
      autoAlpha: 0,
      ease: 'power2.inOut',
      onComplete: done,
    });
  },
};

export default animation;
