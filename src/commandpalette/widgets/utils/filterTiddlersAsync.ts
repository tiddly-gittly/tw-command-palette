/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
import { ITiddlerFields } from 'tiddlywiki';

const isInTidGiDesktop = typeof document !== 'undefined' && document?.location?.protocol?.startsWith('tidgi');
const tidGiWorkspaceID = ((window as any).meta?.())?.workspaceID;

/**
 * @param filter need to add `all[tiddlers+shadows]` by your self.
 * @param system Are you searching system tiddlers? Default is `false`
 * @param exclude need to set to `[]`, otherwise it will exclude text field by default (only return skinny tiddlers)
 * @returns
 */
export async function filterTiddlersAsync(filter: string, options: { exclude?: string[]; system?: boolean; toTiddler?: boolean }): Promise<ITiddlerFields[]> {
  const { system = false, exclude, toTiddler = true } = options;
  if (isInTidGiDesktop && 'service' in window) {
    const wikiServer = (window.service as any).wiki;
    const resultFromIPC = await wikiServer.callWikiIpcServerRoute(
      tidGiWorkspaceID,
      'getTiddlersJSON',
      filter,
      exclude,
      { ignoreSyncSystemConfig: !system },
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
