import { ITiddlerFields } from 'tiddlywiki';
import type { IWorkspace } from '../../../tidgi-types';

const isInTidGiDesktop = typeof document !== 'undefined' && document.location.protocol.startsWith('tidgi');
const tidGiWorkspace: IWorkspace | undefined = window.meta?.().workspace;

/**
 * @param filter need to add `all[tiddlers+shadows]` by your self.
 * @param system Are you searching system tiddlers? Default is `false`
 * @param exclude need to set to `[]`, otherwise it will exclude text field by default (only return skinny tiddlers)
 * @returns
 */
export async function filterTiddlersAsync(filter: string, options: { exclude?: string[]; system?: boolean; toTiddler?: boolean }): Promise<ITiddlerFields[]> {
  const { system = false, exclude, toTiddler = true } = options;
  if (isInTidGiDesktop && 'service' in window && window.service?.wiki && tidGiWorkspace) {
    const wikiServer = window.service.wiki;
    const resultFromIPC = await wikiServer.callWikiIpcServerRoute(
      tidGiWorkspace,
      'getTiddlersJSON',
      filter,
      exclude,
      { ignoreSyncSystemConfig: system, toTiddler },
    );
    return resultFromIPC.data as ITiddlerFields[];
  } else {
    return toTiddler
      ? $tw.wiki.filterTiddlers(filter)
        .map((title) => $tw.wiki.getTiddler(title)?.fields)
        .filter(Boolean) as ITiddlerFields[]
      : $tw.wiki.filterTiddlers(filter).filter(Boolean).map((title) => ({ title })) as ITiddlerFields[];
  }
}
