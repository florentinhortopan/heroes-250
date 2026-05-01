import { useEffect, useState } from 'react';

export default function useTypewriter(text, speed = 30) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    if (typeof text !== 'string' || !text) {
      setDisplayed('');
      return;
    }

    let index = 0;
    let timeoutId;

    setDisplayed('');

    const typeNextChar = () => {
      index += 1;
      setDisplayed(text.slice(0, index));

      if (index < text.length) {
        timeoutId = setTimeout(typeNextChar, speed);
      }
    };

    timeoutId = setTimeout(typeNextChar, speed);

    return () => clearTimeout(timeoutId);
  }, [text, speed]);

  return displayed;
}