import { ITiddlerFields } from 'tiddlywiki';

const isInTidGiDesktop = typeof document !== 'undefined' && document?.location?.protocol?.startsWith('tidgi');
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
const tidGiWorkspaceID = ((window as any).meta?.())?.workspaceID;

export async function filterTiddlersAsync(filter: string, exclude?: string[]): Promise<ITiddlerFields[]> {
  if (isInTidGiDesktop && 'service' in window) {
    // by default tiddlyweb protocol omit all system tiddlers, need to turn off this // TODO: add param to turn off this in TidGi
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    const wikiServer = (window.service as any).wiki;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    const previousServerConfigValue = await wikiServer.wikiOperationInServer('wiki-get-tiddler-text', tidGiWorkspaceID, ['$:/config/SyncSystemTiddlersFromServer']);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    await wikiServer.wikiOperationInServer('wiki-set-tiddler-text', tidGiWorkspaceID, [
      '$:/config/SyncSystemTiddlersFromServer',
      'yes',
    ]);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    const resultFromIPC = await wikiServer.callWikiIpcServerRoute(
      tidGiWorkspaceID,
      'getTiddlersJSON',
      filter,
      exclude,
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    await wikiServer.wikiOperationInServer('wiki-set-tiddler-text', tidGiWorkspaceID, [
      '$:/config/SyncSystemTiddlersFromServer',
      previousServerConfigValue,
    ]);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return resultFromIPC.data as ITiddlerFields[];
  } else {
    return $tw.wiki.filterTiddlers(filter)
      .map((title) => $tw.wiki.getTiddler(title)?.fields)
      .filter(Boolean) as ITiddlerFields[];
  }
}
