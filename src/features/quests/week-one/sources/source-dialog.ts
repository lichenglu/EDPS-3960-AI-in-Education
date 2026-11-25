import references from '@/curriculum/week-one-references.json';

export function enableSourceDialogs() {
  if (typeof HTMLDialogElement === 'undefined' || !HTMLDialogElement.prototype.showModal) return;
  document.addEventListener('click', (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const link =
      event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>('a[data-week-one-source]')
        : null;
    const ref = link && references.find((item) => item.id === Number(link.dataset.weekOneSource));
    if (!ref || !link) return;
    event.preventDefault();
    const dialog = document.createElement('dialog');
    dialog.className = 'source-dialog';
    dialog.setAttribute('aria-labelledby', 'source-dialog-title');
    const heading = document.createElement('h2');
    heading.id = 'source-dialog-title';
    heading.textContent = 'Source [' + ref.id + '] · ' + ref.short;
    const citation = document.createElement('p');
    citation.textContent = ref.citation;
    const location = document.createElement('p');
    location.textContent = ref.locator;
    const links = document.createElement('ul');
    for (const resource of ref.links) {
      const item = document.createElement('li');
      const anchor = document.createElement('a');
      anchor.href = resource.url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.textContent = resource.label;
      item.append(anchor);
      links.append(item);
    }
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Back to activity';
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener(
      'close',
      () => {
        dialog.remove();
        if (link.isConnected) link.focus({ preventScroll: true });
      },
      { once: true },
    );
    dialog.append(heading, citation, location, links, close);
    document.body.append(dialog);
    dialog.showModal();
    close.focus();
  });
}
