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
export async function filterTiddlersAsync(filter: string, system?: boolean, exclude?: string[]): Promise<ITiddlerFields[]> {
  if (isInTidGiDesktop && 'service' in window) {
    // by default tiddlyweb protocol omit all system tiddlers, need to turn off this // TODO: add param to turn off this in TidGi
    const wikiServer = (window.service as any).wiki;
    let previousServerConfigValue: string | undefined;
    if (system === true) {
      previousServerConfigValue = await wikiServer.wikiOperationInServer('wiki-get-tiddler-text', tidGiWorkspaceID, ['$:/config/SyncSystemTiddlersFromServer']);
      await wikiServer.wikiOperationInServer('wiki-add-tiddler', tidGiWorkspaceID, [
        '$:/config/SyncSystemTiddlersFromServer',
        'yes',
      ]);
    }
    const resultFromIPC = await wikiServer.callWikiIpcServerRoute(
      tidGiWorkspaceID,
      'getTiddlersJSON',
      filter,
      exclude,
    );
    if (system === true) {
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
    // FIXME: this prevent [all[tiddlers+shadows]]+[fields[]]+[search[]] to work
    return $tw.wiki.filterTiddlers(filter)
      .map((title) => $tw.wiki.getTiddler(title)?.fields)
      .filter(Boolean) as ITiddlerFields[];
  }
}
