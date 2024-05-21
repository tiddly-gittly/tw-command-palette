/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
import { ITiddlerFields } from 'tiddlywiki';

const isInTidGiDesktop = typeof document !== 'undefined' && document?.location?.protocol?.startsWith('tidgi');
const tidGiWorkspaceID = ((window as any).meta?.())?.workspaceID;

export async function filterTiddlersAsync(filter: string, system?: boolean, exclude?: string[]): Promise<ITiddlerFields[]> {
  if (isInTidGiDesktop && 'service' in window) {
    // by default tiddlyweb protocol omit all system tiddlers, need to turn off this // TODO: add param to turn off this in TidGi
    const wikiServer = (window.service as any).wiki;
    let previousServerConfigValue = 'no';
    if (system === true) {
      previousServerConfigValue = await wikiServer.wikiOperationInServer('wiki-get-tiddler-text', tidGiWorkspaceID, ['$:/config/SyncSystemTiddlersFromServer']);
      await wikiServer.wikiOperationInServer('wiki-set-tiddler-text', tidGiWorkspaceID, [
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
      await wikiServer.wikiOperationInServer('wiki-set-tiddler-text', tidGiWorkspaceID, [
        '$:/config/SyncSystemTiddlersFromServer',
        previousServerConfigValue,
      ]);
    }
    return resultFromIPC.data as ITiddlerFields[];
  } else {
    return $tw.wiki.filterTiddlers(filter)
      .map((title) => $tw.wiki.getTiddler(title)?.fields)
      .filter(Boolean) as ITiddlerFields[];
  }
}
