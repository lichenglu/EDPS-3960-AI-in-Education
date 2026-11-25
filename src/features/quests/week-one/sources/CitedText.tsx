import references from '@/curriculum/week-one-references.json';

export function CitedText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[\d+\])/g).map((part, index) => {
        const source = /^\[(\d+)\]$/.exec(part);
        const reference = source && references.find((item) => item.id === Number(source[1]));
        return reference ? (
          <sup className="source-marker" key={index}>
            <a
              href={'/activities/w01.html#ref-' + reference.id}
              data-week-one-source={reference.id}
              aria-label={'Source ' + reference.id + ', ' + reference.short}
            >
              {part}
            </a>
          </sup>
        ) : (
          part
        );
      })}
    </>
  );
}
