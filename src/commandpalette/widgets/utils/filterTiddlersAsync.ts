import { ITiddlerFields } from 'tiddlywiki';

const isInTidGiDesktop = typeof document !== 'undefined' && document?.location?.protocol?.startsWith('tidgi');
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
const tidGiWorkspaceID = ((window as any).meta?.())?.workspaceID;

export async function filterTiddlersAsync(filter: string): Promise<ITiddlerFields[]> {
  if (isInTidGiDesktop && 'service' in window) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    const resultFromIPC = await (window.service as any).wiki.callWikiIpcServerRoute(
      tidGiWorkspaceID,
      'getTiddlersJSON',
      filter,
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return resultFromIPC.data as ITiddlerFields[];
  } else {
    return $tw.wiki.filterTiddlers(filter)
      .map((title) => $tw.wiki.getTiddler(title)?.fields)
      .filter(Boolean) as ITiddlerFields[];
  }
}
