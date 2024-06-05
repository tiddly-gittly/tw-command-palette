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
    // by default tiddlyweb protocol omit all system tiddlers, need to turn off this // TODO: add param to turn off this in TidGi
    const wikiServer = (window.service as any).wiki;
    let previousServerConfigValue: string | undefined;
    if (system) {
      previousServerConfigValue = await wikiServer.wikiOperationInServer('wiki-get-tiddler-text', tidGiWorkspaceID, ['$:/config/SyncSystemTiddlersFromServer']);
      await wikiServer.wikiOperationInServer('wiki-add-tiddler', tidGiWorkspaceID, [
        '$:/config/SyncSystemTiddlersFromServer',
        'yes',
      ]);
    }
    // FIXME: this prevent [all[tiddlers+shadows]]+[fields[]]+[search[]] to work, need to modify tidgi side
    const resultFromIPC = await wikiServer.callWikiIpcServerRoute(
      tidGiWorkspaceID,
      'getTiddlersJSON',
      filter,
      exclude,
    );
    if (system) {
      if (previousServerConfigValue === undefined) {
        await wikiServer.wikiOperationInServer('wiki-delete-tiddler', tidGiWorkspaceID, [
          '$:/config/SyncSystemTiddlersFromServer',
        ]);
      } else {
        await wikiServer.wikiOperationInServer('wiki-add-tiddler', tidGiWorkspaceID, [
          '$:/config/SyncSystemTiddlersFromServer',
          previousServerConfigValue,
        ]);
      }
    }
    return resultFromIPC.data as ITiddlerFields[];
  } else {
    return toTiddler
      ? $tw.wiki.filterTiddlers(filter)
        .map((title) => $tw.wiki.getTiddler(title)?.fields)
        .filter(Boolean) as ITiddlerFields[]
      : $tw.wiki.filterTiddlers(filter).filter(Boolean).map((title) => ({ title })) as ITiddlerFields[];
  }
}
