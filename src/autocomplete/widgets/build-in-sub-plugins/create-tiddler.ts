import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsUnderFilter } from '../utils/checkPrefix';
import { contextActions, contextReducer, IContext } from '../utils/context';
import { debounced } from '../utils/debounce';
import { lingo } from '../utils/lingo';

/**
 * Two-phase "Create tiddler" wizard:
 *
 * - Phase 1 entrypoint is handled in command-message.ts when user selects
 *   the `tm-new-tiddler` command. That sets `createTiddlerPending=true`.
 * - Phase 2 is implemented here: ask for title in the main input; Enter on
 *   the generated item creates the tiddler.
 */
export const plugin = {
  async getSources(parameters) {
    if (checkIsUnderFilter(parameters)) return [];
    const context = parameters.state.context as IContext;
    if (!context.createTiddlerPending) return [];

    const { widget } = context;
    const rawTitle = parameters.query.trim();

    return await debounced([{
      sourceId: 'create-tiddler',
      getItems() {
        if (!rawTitle) {
          return [{ title: lingo('CreateTiddler/Prompt'), text: '', type: 'text/vnd.tiddlywiki', tags: [] } satisfies ITiddlerFields];
        }
        const syntheticItem: ITiddlerFields = {
          title: rawTitle,
          text: '',
          type: 'text/vnd.tiddlywiki',
          tags: [],
        };
        return [syntheticItem];
      },
      getItemUrl({ item }) {
        return item.title;
      },
      onSelect({ item }) {
        if (!rawTitle) return;
        parameters.setContext(contextReducer(contextActions.finishCreateTiddlerWizard()));
        // Tell onEnter this activation is already handled by this source.
        if (widget) {
          widget.commandHandled = true;
          widget.commandKeepOpen = false;
        }
        widget?.dispatchEvent({
          type: 'tm-new-tiddler',
          paramObject: { title: item.title },
        });
      },
      templates: {
        header() {
          return lingo('CreateTiddler/Header');
        },
        item({ item, createElement }) {
          const isPrompt = !rawTitle;
          const onclick = () => {
            if (isPrompt) return;
            parameters.setContext(contextReducer(contextActions.finishCreateTiddlerWizard()));
            if (widget) {
              widget.commandHandled = true;
              widget.commandKeepOpen = false;
            }
            widget?.dispatchEvent({ type: 'tm-new-tiddler', paramObject: { title: item.title } });
            parameters.navigator.navigate({ item, itemUrl: item.title, state });
          };
          const text = isPrompt
            ? lingo('CreateTiddler/TypeToCreate')
            : `${lingo('CreateTiddler/CreateLabel')}: ${item.title}`;
          return createElement('div', { onclick, onTap: onclick },
            text,
          );
        },
      },
    }]);
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
