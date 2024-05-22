/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { IWidgetEvent } from 'tiddlywiki';

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
exports.name = 'commandpalette/message-handlers/startup';
exports.after = ['startup'];
exports.synchronous = true;
exports.startup = function() {
  /**
   * Handle message that trigger open the default command palette ($:/plugins/linonetwo/commandpalette/tiddlywiki-ui/DefaultCommandPalette)
   */
  $tw.rootWidget.addEventListener('open-command-palette', (originalEvent: IWidgetEvent) => {
    const event = $tw.hooks.invokeHook('th-open-command-palette', originalEvent);
    // message can provide a command palette ID to open, default to 'default', which is used on the default command palette's widget.
    const commandPaletteID = event?.paramObject?.id as string || 'default';
    const prefix = event?.paramObject?.prefix as string || '';
    /** For ctrl-tab handling */
    const historyMode = event?.paramObject?.historyMode as string || 'no';
    // Don't forget add transclusion in `src/commandpalette/DefaultCommandPalette.tid` for new param
    $tw.wiki.addTiddler({ title: `$:/temp/commandpalette/${commandPaletteID}/opened`, text: 'yes', prefix, historyMode });
    return false;
  });
  $tw.rootWidget.addEventListener('close-command-palette', (originalEvent: IWidgetEvent) => {
    const event = $tw.hooks.invokeHook('th-close-command-palette', originalEvent);
    // message can provide a command palette ID to close, default to 'default', which is used on the default command palette's widget.
    const commandPaletteID = event?.param || 'default';
    $tw.wiki.deleteTiddler(`$:/temp/commandpalette/${commandPaletteID}/opened`);
    return false;
  });
};
