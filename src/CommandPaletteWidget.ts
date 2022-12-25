/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable unicorn/prevent-abbreviations */
import uniq from 'lodash/uniq';
import debounce from 'lodash/debounce';
import type { IWidgetEvent } from 'tiddlywiki';

const Widget = require('$:/core/modules/widgets/widget.js').widget;

type AllPossibleEvent = IWidgetEvent | PointerEvent | KeyboardEvent | MouseEvent;
export interface IResult {
  action?: (event: AllPossibleEvent) => void;
  caption?: string;
  hint?: string;
  name: string;
}
export interface IHistoryResult extends IResult {
  title: string;
}

export interface IAction extends IResult {
  immediate?: boolean;
  keepPalette: boolean;
}

export interface ITrigger extends IResult {
  text: string;
  trigger: string;
}

/**
 * The data stored in the searchStepsPath , are filter templates for default searcher. caret means where to put the terms, usually inside the filter like `search[${here}]`
 * filterFallback means the filter to use when pinyinfuse not installed
 */
export interface IRawSearchStep {
  steps: Array<{ caret: string; caretFallback: string; filter: string; filterFallback: string; hint: string }>;
}
export interface ISearchStep {
  caret: number;
  filter: string;
  hint: string;
}

export interface ITiddler {
  fields: {
    'command-palette-caption'?: string;
    'command-palette-caret'?: string;
    'command-palette-hint'?: string;
    'command-palette-immediate'?: string;
    'command-palette-mode'?: string;
    'command-palette-name'?: string;
    'command-palette-trigger'?: string;
    // our custom fields
    'command-palette-type'?: string;
    'command-palette-user-input'?: string;
    tags: string[];
    text: string;
    title: string;
  };
}

export interface ISettings {
  alwaysPassSelection: boolean;
  escapeGoesBack: boolean;
  maxResultHintSize: number;
  maxResults: number;
  neverBasic: boolean;
  showHistoryOnOpen: boolean;
  theme: string;
}

export type IValidator = (term: string) => boolean;

class CommandPaletteWidget extends Widget {
  private actions: IAction[] = [];
  private readonly triggers: ITrigger[] = [];
  private currentResults: HTMLDivElement[] = [];

  private readonly typeField = 'command-palette-type' as const;
  /** 用于搜索的字段 */
  private readonly nameField = 'command-palette-name' as const;
  /** 用于展示翻译内容的字段 */
  private readonly captionField = 'command-palette-caption' as const;
  private readonly hintField = 'command-palette-hint' as const;
  private readonly modeField = 'command-palette-mode' as const;
  private readonly userInputField = 'command-palette-user-input' as const;
  private readonly caretField = 'command-palette-caret' as const;
  private readonly immediateField = 'command-palette-immediate' as const;
  private readonly triggerField = 'command-palette-trigger' as const;

  private currentSelection = 0; // 0 is nothing selected, 1 is first result,...
  private symbolProviders: Record<string, { resolver: (e: AllPossibleEvent) => void; searcher: (term: string, hint?: string) => void }> = {};
  private blockProviderChange = false;
  private readonly defaultSettings: ISettings = {
    maxResults: 15,
    maxResultHintSize: 45,
    neverBasic: false,
    showHistoryOnOpen: true,
    escapeGoesBack: true,
    alwaysPassSelection: false,
    theme: '$:/plugins/linonetwo/commandpalette/Compact.css',
  };

  private settings: Partial<ISettings> = {};
  private readonly commandHistoryPath = '$:/plugins/linonetwo/commandpalette/CommandPaletteHistory' as const;
  private readonly settingsPath = '$:/plugins/linonetwo/commandpalette/CommandPaletteSettings' as const;
  private readonly searchStepsPath = '$:/plugins/linonetwo/commandpalette/CommandPaletteSearchSteps' as const;
  private readonly customCommandsTag = '$:/tags/CommandPaletteCommand' as const;
  private readonly themesTag = '$:/tags/CommandPaletteTheme' as const;

  /** current item's click/enter handler function */
  private currentResolver: (e: AllPossibleEvent) => void = () => {};
  /** basically means defaultProvider */
  private currentProvider: (input: string) => void = () => {};

  private searchSteps: Array<(term: string) => IResult[]> = [];

  /**
   * Fix IME issue in https://segmentfault.com/a/1190000012490380
   */
  private isIMEOpen = false;

  constructor(parseTreeNode: any, options: any) {
    super(parseTreeNode, options);
    this.initialise(parseTreeNode, options);
    this.onInput = debounce(this.onInput, 300);
  }

  actionStringBuilder(text: any) {
    return (e: any) => this.invokeActionString(text, this, e);
  }

  actionStringInput(action: any, hint: any, _e: any) {
    this.blockProviderChange = true;
    this.allowInputFieldSelection = true;
    this.hint.innerText = hint;
    this.input.value = '';
    this.currentProvider = () => {};
    this.currentResolver = (e: AllPossibleEvent) => {
      this.invokeActionString(action, this, e, { commandpaletteinput: this.input.value });
      this.closePalette();
    };
    this.showResults([]);
    this.onInput(this.input.value);
  }

  invokeFieldMangler(tiddler: any, message: any, parameter: any, e: any) {
    const action = `<$fieldmangler tiddler="${tiddler}">
			<$action-sendmessage $message="${message}" $param="${parameter}"/>
			</$fieldmangler>`;
    this.invokeActionString(action, this, e);
  }

  tagOperation(
    _event: AllPossibleEvent,
    hintTiddler: string,
    hintTag: string,
    /** (tiddler, terms) => [tiddlers] */
    filter: (tiddler: string, terms: string) => string[],
    allowNoSelection: boolean,
    message: string,
  ) {
    this.blockProviderChange = true;
    if (allowNoSelection) this.allowInputFieldSelection = true;
    this.currentProvider = this.historyProviderBuilder(hintTiddler);
    this.currentResolver = (_e: AllPossibleEvent) => {
      if (this.currentSelection === 0) return;
      const tiddler: string | undefined = this.getDataFromResultDiv(this.currentResults[this.currentSelection - 1], 'name');
      this.currentProvider = (terms: string) => {
        this.currentSelection = 0;
        this.hint.innerText = hintTag;
        if (tiddler) {
          const searches = filter(tiddler, terms);
          this.showResults(
            searches.map((s) => {
              return { name: s };
            }),
          );
        }
      };
      this.input.value = '';
      this.onInput(this.input.value);
      this.currentResolver = (e: AllPossibleEvent) => {
        if (!allowNoSelection && this.currentSelection === 0) return;
        let tag: string | undefined = this.input.value;
        if (this.currentSelection !== 0) {
          tag = this.getDataFromResultDiv(this.currentResults[this.currentSelection - 1], 'name');
        }
        this.invokeFieldMangler(tiddler, message, tag, e);
        if (e.getModifierState('Shift')) {
          this.onInput(this.input.value);
        } else {
          this.closePalette();
        }
      };
    };
    this.input.value = '';
    this.onInput(this.input.value);
  }

  refreshThemes(e: AllPossibleEvent) {
    this.themes = this.getTiddlersWithTag(this.themesTag);
    let found = false;
    for (const theme of this.themes) {
      const themeName = theme.fields.title;
      if (themeName === this.settings.theme) {
        found = true;
        this.addTagIfNecessary(themeName, '$:/tags/Stylesheet', e);
      } else {
        this.invokeFieldMangler(themeName, 'tm-remove-tag', '$:/tags/Stylesheet', e);
      }
    }
    if (found) return;
    this.addTagIfNecessary(this.defaultSettings.theme, '$:/tags/Stylesheet', e);
  }

  // Re-adding an existing tag changes modification date
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'tiddler' implicitly has an 'any' type.
  addTagIfNecessary(tiddler, tag, e) {
    if (this.hasTag(tiddler, tag)) return;
    this.invokeFieldMangler(tiddler, 'tm-add-tag', tag, e);
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'tiddler' implicitly has an 'any' type.
  hasTag(tiddler, tag) {
    return !!$tw.wiki.getTiddler(tiddler)?.fields?.tags?.includes(tag);
  }

  refreshCommands() {
    this.actions = [];
    this.actions.push(
      {
        name: 'Refresh Command Palette',
        action: (_e: AllPossibleEvent) => {
          this.refreshCommandPalette();
          this.promptCommand('');
        },
        keepPalette: true,
      },
      { name: 'Explorer', action: (e: AllPossibleEvent) => this.explorer(e), keepPalette: true },
      { name: 'History', caption: '查看历史记录', action: (_e: AllPossibleEvent) => this.showHistory(), keepPalette: true },
      { name: 'New Command Wizard', caption: '交互式创建新命令', action: (_e: AllPossibleEvent) => this.newCommandWizard(), keepPalette: true },
      {
        name: 'Add tag to tiddler',
        caption: '向条目添加标签',
        action: (e) =>
          this.tagOperation(
            e,
            '选择一个条目来添加标签',
            '选择一个标签来添加 (⇧⏎ 可以多次添加)',
            (tiddler: string, terms: string): string[] =>
              $tw.wiki.filterTiddlers(
                `[!is[system]tags[]] [is[system]tags[]] -[[${tiddler}]tags[]] +[${$tw.utils.pinyinfuse ? 'pinyinfuse' : 'search'}[${terms}]]`,
              ),
            true,
            'tm-add-tag',
          ),
        keepPalette: true,
      },
      {
        name: 'Remove tag',
        caption: '去除标签',
        action: (e) =>
          this.tagOperation(
            e,
            '选择一个条目来去除标签',
            '选择一个标签来去除 (⇧⏎ 可以去除多次)',

            (tiddler: string, terms: string): string[] =>
              $tw.wiki.filterTiddlers(`[[${tiddler}]tags[]] +[${$tw.utils.pinyinfuse ? 'pinyinfuse' : 'search'}[${terms}]]`),
            false,
            'tm-remove-tag',
          ),
        keepPalette: true,
      },
    );

    const commandTiddlers = this.getTiddlersWithTag(this.customCommandsTag);
    for (const tiddler of commandTiddlers) {
      if (!tiddler.fields[this.typeField] === undefined) continue;
      const name = tiddler.fields[this.nameField];
      if (typeof name !== 'string') throw new Error(`命令菜单条目 ${tiddler.fields.title} 缺失 ${this.nameField} 字段`);
      const caption = this.translateCaption(tiddler.fields[this.captionField]);
      const type = tiddler.fields[this.typeField];
      let text = this.translateCaption(tiddler.fields.text);
      if (text === undefined) text = '';
      const textFirstLine = (text.match(/^.*/) ?? [''])[0];
      const hint = this.translateCaption(tiddler.fields[this.hintField] ?? tiddler.fields[this.nameField] ?? '');
      if (type === 'shortcut') {
        ``;
        const trigger = tiddler.fields[this.triggerField];
        if (trigger === undefined) continue;
        this.triggers.push({ name, caption, trigger, text, hint });
        continue;
      }
      if (!tiddler.fields[this.nameField] === undefined) continue;
      if (type === 'prompt') {
        const immediate = !!tiddler.fields[this.immediateField];
        const caret: number = Number(tiddler.fields[this.caretField]) ?? 0;
        const action = { name, caption, hint, action: () => this.promptCommand(textFirstLine, caret), keepPalette: !immediate, immediate };
        this.actions.push(action);
        continue;
      }
      if (type === 'prompt-basic') {
        const caret: number = Number(tiddler.fields[this.caretField]) ?? 0;
        const action = { name, caption, hint, action: () => this.promptCommandBasic(textFirstLine, caret, hint), keepPalette: true };
        this.actions.push(action);
        continue;
      }
      if (type === 'message') {
        this.actions.push({ name, caption, hint, action: (e: AllPossibleEvent) => this.tmMessageBuilder(textFirstLine)(e), keepPalette: false });
        continue;
      }
      if (type === 'actionString') {
        const userInput = tiddler.fields[this.userInputField] !== undefined && tiddler.fields[this.userInputField] === 'true';
        if (userInput) {
          this.actions.push({ name, caption, hint, action: (e: AllPossibleEvent) => this.actionStringInput(text, hint, e), keepPalette: true });
        } else {
          this.actions.push({ name, caption, hint, action: (e: AllPossibleEvent) => this.actionStringBuilder(text)(e), keepPalette: false });
        }
        continue;
      }
      if (type === 'history') {
        const mode = tiddler.fields[this.modeField];
        this.actions.push({
          name,
          caption,
          hint,
          action: (e: AllPossibleEvent) => this.commandWithHistoryPicker(textFirstLine, hint, mode).handler(e),
          keepPalette: true,
        });
        continue;
      }
    }
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'caption' implicitly has an 'any' type.
  translateCaption(caption) {
    return $tw.wiki.renderText('text/plain', 'text/vnd.tiddlywiki', caption);
  }

  newCommandWizard() {
    this.blockProviderChange = true;
    this.input.value = '';
    this.hint.innerText = '命令名';
    let name = '';
    let type = '';
    let hint = '';

    const messageStep = () => {
      this.input.value = '';
      this.hint.innerText = '输入信息';
      this.currentResolver = (e: AllPossibleEvent) => {
        this.tmMessageBuilder('tm-new-tiddler', {
          title: '$:/' + name,
          tags: this.customCommandsTag,
          [this.typeField]: type,
          [this.nameField]: name,
          [this.hintField]: hint,
          text: this.input.value,
        })(e);
        this.closePalette();
      };
    };

    const hintStep = () => {
      this.input.value = '';
      this.hint.innerText = '输入提示文本';
      this.currentResolver = (_e: AllPossibleEvent) => {
        hint = this.input.value;
        messageStep();
      };
    };

    const typeStep = () => {
      this.input.value = '';
      this.hint.innerText = 'Enter type (prompt, prompt-basic, message, actionString, history)';
      this.currentResolver = (e: AllPossibleEvent) => {
        type = this.input.value;
        if (type === 'history') {
          hintStep();
        } else {
          this.tmMessageBuilder('tm-new-tiddler', {
            title: '$:/' + name,
            tags: this.customCommandsTag,
            [this.typeField]: type,
            [this.nameField]: name,
          })(e);
          this.closePalette();
        }
      };
    };

    this.currentProvider = (_terms: string) => {};
    this.currentResolver = (_e: AllPossibleEvent) => {
      if (this.input.value.length === 0) return;
      name = this.input.value;
      typeStep();
    };
    this.showResults([]);
  }

  explorer(_e: AllPossibleEvent) {
    this.blockProviderChange = true;
    this.input.value = '$:/';
    this.lastExplorerInput = '$:/';
    this.hint.innerText = 'Explorer (⇧⏎ to add multiple)';
    this.currentProvider = (terms: string) => this.explorerProvider('$:/', terms);
    this.currentResolver = (e: AllPossibleEvent) => {
      if (this.currentSelection === 0) return;
      this.getActionFromResultDiv(this.currentResults[this.currentSelection - 1])?.(e);
    };
    this.onInput();
  }

  explorerProvider(url: string, _terms: string) {
    const switchFolder = (url: string) => {
      this.input.value = url;
      this.lastExplorerInput = this.input.value;
      this.currentProvider = (terms: string) => this.explorerProvider(url, terms);
      this.onInput();
    };
    if (!this.input.value.startsWith(url)) {
      this.input.value = this.lastExplorerInput;
    }
    this.lastExplorerInput = this.input.value;
    this.currentSelection = 0;
    const search = this.input.value.substr(url.length);

    const tiddlers = $tw.wiki.filterTiddlers(`[removeprefix[${url}]splitbefore[/]sort[]${$tw.utils.pinyinfuse ? 'pinyinfuse' : 'search'}[${search}]]`);
    const folders = [];
    const files = [];
    for (const tiddler of tiddlers) {
      if (tiddler.endsWith('/')) {
        folders.push({ name: tiddler, action: (_e: AllPossibleEvent) => switchFolder(`${url}${tiddler}`) });
      } else {
        files.push({
          name: tiddler,
          action: (e: AllPossibleEvent) => {
            this.navigateTo(`${url}${tiddler}`);
            if (!e.getModifierState('Shift')) {
              this.closePalette();
            }
          },
        });
      }
    }
    let topResult;
    if (url !== '$:/') {
      const splits = url.split('/');
      splits.splice(-2);
      const parent = splits.join('/') + '/';
      topResult = { name: '..', action: (_e: AllPossibleEvent) => switchFolder(parent) };
      this.showResults([topResult, ...folders, ...files]);
      return;
    }
    this.showResults([...folders, ...files]);
  }

  setSetting<K extends keyof ISettings>(name: K, value: ISettings[K]) {
    // doing the validation here too (it's also done in refreshSettings, so you can load you own settings with a json file)
    if (typeof value === 'string') {
      if (value === 'true') (value as unknown as boolean) = true;
      if (value === 'false') (value as unknown as boolean) = false;
    }
    this.settings[name] = value;

    $tw.wiki.setTiddlerData(this.settingsPath, this.settings);
  }

  // loadSettings?
  refreshSettings<K extends keyof ISettings>() {
    // get user or default settings

    this.settings = $tw.wiki.getTiddlerData(this.settingsPath, { ...this.defaultSettings });
    // Adding eventual missing properties to current user settings
    for (const property in this.defaultSettings) {
      if (!this.defaultSettings.hasOwnProperty(property)) continue;
      const ownProperty = property as K;
      if (this.settings[ownProperty] === undefined) {
        this.settings[ownProperty] = this.defaultSettings[ownProperty];
      }
    }
    // cast all booleans from string from tw
    for (const property in this.settings) {
      if (!this.settings.hasOwnProperty(property)) continue;
      const ownProperty = property as K;
      if (typeof this.settings[ownProperty] !== 'string') continue;
      if ((this.settings[ownProperty] as string).toLowerCase() === 'true') (this.settings[ownProperty] as boolean) = true;
      if ((this.settings[ownProperty] as string).toLowerCase() === 'false') (this.settings[ownProperty] as boolean) = false;
    }
  }

  // helper function to retrieve all tiddlers (+ their fields) with a tag
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'tag' implicitly has an 'any' type.
  getTiddlersWithTag(tag): ITiddler[] {
    const tiddlers = $tw.wiki.getTiddlersWithTag(tag);
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 't' implicitly has an 'any' type.
    return tiddlers.map((t) => $tw.wiki.getTiddler(t));
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'parent' implicitly has an 'any' type.
  render(parent, nextSibling) {
    this.parentDomNode = parent;
    this.execute();
    if ($tw.utils.pinyinfuse === undefined) {
      console.warn('需要安装 linonetwo/pinyin-fuzzy-search 插件以获得模糊搜索和拼音搜索的能力');
    }

    this.history = $tw.wiki.getTiddlerData(this.commandHistoryPath, { history: [] }).history;

    $tw.rootWidget.addEventListener('open-command-palette', (e: AllPossibleEvent) => {
      $tw.hooks.invokeHook('th-open-command-palette', e);
      this.openPalette(e, e.param);
    });

    $tw.rootWidget.addEventListener('open-command-palette-selection', (e: AllPossibleEvent) => this.openPaletteSelection(e));

    $tw.rootWidget.addEventListener('insert-command-palette-result', (e: AllPossibleEvent) => this.insertSelectedResult());

    $tw.rootWidget.addEventListener('command-palette-switch-history', (e) => this.handleSwitchHistory(e, true));

    $tw.rootWidget.addEventListener('command-palette-switch-history-back', (e) => this.handleSwitchHistory(e, false));

    const inputAndMainHintWrapper = this.createElement('div', { className: 'inputhintwrapper' });
    this.div = this.createElement('div', { className: 'commandpalette' }, { display: 'none' });
    this.mask = this.createElement('div', { className: 'commandpalette-masklayer' }, { opacity: '0' });
    this.input = this.createElement('input', { type: 'text' });
    this.hint = this.createElement('div', { className: 'commandpalettehint commandpalettehintmain' });
    inputAndMainHintWrapper.append(this.input, this.hint);
    this.scrollDiv = this.createElement('div', { className: 'cp-scroll' });
    this.div.append(inputAndMainHintWrapper, this.scrollDiv);
    this.input.addEventListener('keydown', (e: KeyboardEvent) => this.onKeyDown(e));
    this.input.addEventListener('input', () => this.onInput(this.input.value));
    // Fix IME issue
    this.input.addEventListener(
      'compositionstart',
      () => {
        this.isIMEOpen = true;
      },
      false,
    );
    this.input.addEventListener(
      'compositionend',
      () => {
        this.isIMEOpen = false;
      },
      false,
    );

    document.addEventListener('click', (e: PointerEvent | MouseEvent | TouchEvent) => this.onClick(e));
    parent.insertBefore(this.mask, nextSibling);
    parent.insertBefore(this.div, nextSibling);

    this.refreshCommandPalette();

    this.symbolProviders['>'] = { searcher: (terms: string) => this.actionProvider(terms), resolver: (e) => this.actionResolver(e) };
    this.symbolProviders['》'] = this.symbolProviders['>'];
    this.symbolProviders['##'] = { searcher: (terms: string) => this.tagListProvider(terms), resolver: (e) => this.tagListResolver(e) };
    this.symbolProviders['#'] = { searcher: (terms: string) => this.tagProvider(terms), resolver: (e) => this.defaultResolver(e) };
    this.symbolProviders['?'] = { searcher: (terms: string) => this.helpProvider(terms), resolver: (e) => this.helpResolver(e) };
    this.symbolProviders['？'] = this.symbolProviders['?'];
    this.symbolProviders['['] = { searcher: (terms: string, hint?: string) => this.filterProvider(terms, hint), resolver: (e) => this.filterResolver(e) };
    this.symbolProviders['+'] = { searcher: (terms: string) => this.createTiddlerProvider(terms), resolver: (e) => this.createTiddlerResolver(e) };
    this.symbolProviders['|'] = { searcher: (terms: string) => this.settingsProvider(terms), resolver: (e) => this.settingsResolver(e) };
    this.currentResults = [];
    this.currentProvider = () => {};
  }

  helpProvider(_terms: string) {
    // TODO: tiddlerify?
    this.currentSelection = 0;
    this.hint.innerText = 'Help';
    const searches = [
      { name: '直接打字是搜索条目标题和内容；而以下述特殊字符开头可以执行特殊搜索', action: () => this.promptCommand('') },
      { name: '> 查看和搜索命令列表', action: () => this.promptCommand('>') },
      { name: '+ 创建条目，先输入条目名，然后可以带上#打标签', action: () => this.promptCommand('+') },
      { name: '# 列出带标签的条目（标签不可包含空格，用空格隔开多个#开头的标签，不带#的作为搜索词）', action: () => this.promptCommand('#') },
      { name: '## 搜索标签列表', action: () => this.promptCommand('##', 2) },
      { name: '[ 筛选器语句', action: () => this.promptCommand('[') },
      { name: '| 命令菜单设置', action: () => this.promptCommand('|') },
      { name: '\\ 规避第一个字符是上述命令字符的情况，例如「\\#」可搜标题以「#」起头的条目', action: () => this.promptCommand('\\') },
      { name: '? 打开帮助', action: () => this.promptCommand('?') },
    ];
    this.showResults(searches);
  }

  /**
   * 解析输入，默认前两位可能是命令字符，会到 this.symbolProviders 里查找相应的 provider
   */
  parseCommand(text: string) {
    let terms = '';
    let resolver;
    let provider;
    const shortcut = this.triggers.find((t) => text.startsWith(t.trigger));
    if (shortcut === undefined) {
      // 从上到下找，先找长的，再找短的，以便 ## 优先匹配 ## 而不是 #
      const providerSymbol = Object.keys(this.symbolProviders)
        .sort((a, b) => -a.length + b.length)
        .find((symbol) => text.startsWith(symbol));
      if (providerSymbol === undefined) {
        resolver = this.defaultResolver;
        provider = this.defaultProvider;
        terms = text;
      } else {
        provider = this.symbolProviders[providerSymbol].searcher;
        resolver = this.symbolProviders[providerSymbol].resolver;
        terms = text.replace(providerSymbol, '');
      }
    } else {
      resolver = (e: AllPossibleEvent) => {
        const inputWithoutShortcut = this.input.value.substr(shortcut.trigger.length);
        this.invokeActionString(shortcut.text, this, e, { commandpaletteinput: inputWithoutShortcut });
        this.closePalette();
      };
      provider = (_terms: string) => {
        this.hint.innerText = shortcut.hint;
        this.showResults([]);
      };
    }
    return { resolver, provider, terms };
  }

  refreshSearchSteps() {
    this.searchSteps = [];
    const steps = $tw.wiki.getTiddlerData<IRawSearchStep>(this.searchStepsPath).steps;
    for (const step of steps) {
      this.searchSteps.push(
        this.searchStepBuilder(
          $tw.utils.pinyinfuse ? step.filter : step.filterFallback,
          Number($tw.utils.pinyinfuse ? step.caret : step.caretFallback),
          step.hint,
        ),
      );
    }
  }

  refreshCommandPalette() {
    this.refreshSettings();
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 0.
    this.refreshThemes();
    this.refreshCommands();
    this.refreshSearchSteps();
  }

  handleSwitchHistory(event: KeyboardEvent, forward: boolean) {
    // we have history list in palette by default, if we have showHistoryOnOpen === true
    // TODO: handle this if !showHistoryOnOpen
    if (!this.isOpened) {
      this.openPalette(event);
    }

    this.onKeyDown(
      new KeyboardEvent('keydown', {
        bubbles: false,
        cancelable: true,
        key: forward ? 'ArrowDown' : 'ArrowUp',
        shiftKey: false,
      }),
    );

    const onCtrlKeyUp = (keyUpEvent: KeyboardEvent) => {
      if (!keyUpEvent.ctrlKey) {
        this.currentResolver(keyUpEvent);
        window.removeEventListener('keyup', onCtrlKeyUp);
      }
    };

    window.addEventListener('keyup', onCtrlKeyUp);
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'command' implicitly has an 'any' type.
  updateCommandHistory(command) {
    this.history = [...new Set([command.name, ...this.history])];

    $tw.wiki.setTiddlerData(this.commandHistoryPath, { history: this.history });
  }

  historyProviderBuilder(hint: string, mode?: 'drafts' | 'story') {
    return (_terms: string) => {
      this.currentSelection = 0;
      this.hint.innerText = hint;
      let results;
      if (mode !== undefined && mode === 'drafts') {
        results = $tw.wiki.filterTiddlers('[has:field[draft.of]]');
      } else if (mode !== undefined && mode === 'story') {
        results = $tw.wiki.filterTiddlers('[list[$:/StoryList]]');
      } else {
        results = this.getHistory();
      }
      results = results.map((r) => {
        return { name: r };
      });
      this.showResults(results);
    };
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'message' implicitly has an 'any' type.
  commandWithHistoryPicker(message, hint, mode) {
    const handler = (_e: AllPossibleEvent) => {
      this.blockProviderChange = true;
      this.allowInputFieldSelection = true;
      this.currentProvider = provider;
      this.currentResolver = resolver;
      this.input.value = '';
      this.onInput(this.input.value);
    };
    const provider = this.historyProviderBuilder(hint, mode);
    const resolver = (_e: AllPossibleEvent) => {
      if (this.currentSelection === 0) return;
      const title = this.getDataFromResultDiv(this.currentResults[this.currentSelection - 1], 'name');
      this.parentWidget.dispatchEvent({
        type: message,
        param: title,
        tiddlerTitle: title,
      });
      this.closePalette();
    };
    return {
      handler,
      provider,
      resolver,
    };
  }

  onInput(text = '') {
    if (this.blockProviderChange) {
      // prevent provider changes
      this.currentProvider(text);
      this.setSelectionToFirst();
      return;
    }
    const { resolver, provider, terms } = this.parseCommand(text);
    this.currentResolver = resolver;
    this.currentProvider = provider;
    this.currentProvider(terms);
    this.setSelectionToFirst();
  }

  onClick(event: MouseEvent | PointerEvent | TouchEvent) {
    if (this.isOpened && !this.div.contains(event.target)) {
      this.closePalette();
    }
  }

  openPaletteSelection(event: AllPossibleEvent) {
    const selection = this.getCurrentSelection();
    this.openPalette(event, selection);
  }

  openPalette(_e: AllPossibleEvent, selection?: string) {
    // call currentProvider first to ask currentProvider load latest history. Otherwise it will load history after open, which will show old one and refresh.
    this.currentProvider('');
    this.isOpened = true;
    this.allowInputFieldSelection = false;
    this.goBack = undefined;
    this.blockProviderChange = false;
    const activeElement = this.getActiveElement();
    this.previouslyFocused = {
      element: activeElement,
      start: activeElement.selectionStart,
      end: activeElement.selectionEnd,
      caretPos: activeElement.selectionEnd,
    };
    this.input.value = '';
    if (selection !== undefined) {
      this.input.value = selection;
    }
    if (this.settings.alwaysPassSelection) {
      this.input.value += this.getCurrentSelection();
    }
    this.currentSelection = 0;
    this.onInput(this.input.value); // Trigger results on open
    this.div.style.display = 'flex';
    this.mask.style.opacity = '0.6';
    this.input.focus();
  }

  insertSelectedResult() {
    if (!this.isOpened) return;
    if (this.currentSelection === 0) return; // TODO: what to do here?
    const previous = this.previouslyFocused;
    const previousValue = previous.element.value;
    if (previousValue === undefined) return;
    const selection = this.getDataFromResultDiv(this.currentResults[this.currentSelection - 1], 'name');
    // TODO: early return may cause bug here?
    if (!selection) return;
    if (previous.start === previous.end) {
      this.previouslyFocused.element.value = previousValue.substring(0, previous.start) + selection + previousValue.substring(previous.start);
    } else {
      this.previouslyFocused.element.value = previousValue.substring(0, previous.start) + selection + previousValue.substring(previous.end);
    }
    this.previouslyFocused.caretPos = previous.start + selection.length;
    this.closePalette();
  }

  closePalette() {
    this.div.style.display = 'none';
    this.mask.style.opacity = '0';
    this.isOpened = false;
    this.focusAtCaretPosition(this.previouslyFocused.element, this.previouslyFocused.caretPos);
  }

  onKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case 'Escape': {
        //									\/ There's no previous state
        if (!this.settings.escapeGoesBack || this.goBack === undefined) {
          this.closePalette();
        } else {
          this.goBack();
          this.goBack = undefined;
        }

        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        e.stopPropagation();
        let sel = this.currentSelection - 1;

        if (sel === 0) {
          if (!this.allowInputFieldSelection) {
            sel = this.currentResults.length;
          }
        } else if (sel < 0) {
          sel = this.currentResults.length;
        }
        this.setSelection(sel);

        break;
      }
      case 'ArrowDown': {
        e.preventDefault();
        e.stopPropagation();
        let sel = (this.currentSelection + 1) % (this.currentResults.length + 1);
        if (!this.allowInputFieldSelection && sel === 0 && this.currentResults.length > 0) {
          sel = 1;
        }
        this.setSelection(sel);

        break;
      }
      case 'Enter': {
        e.preventDefault();
        e.stopPropagation();
        this.validateSelection(e);

        break;
      }
      // No default
    }
  }

  addResult(result: IResult, id: number) {
    const resultDiv = this.createElement('div', { className: 'commandpaletteresult' });
    const titleDiv = this.createElement('div', { className: 'commandpalettetitle', innerText: result.caption || result.name });
    resultDiv.appendChild(titleDiv);
    if (result.hint !== undefined) {
      const hint = this.createElement('div', { className: 'commandpalettehint', innerText: result.hint });
      resultDiv.appendChild(hint);
    }
    // we will get this later
    resultDiv.dataset.result = JSON.stringify(result);
    /** we use this to pass the action */
    if (result.action != undefined) {
      resultDiv.onabort = result.action as unknown as (this: GlobalEventHandlers, event_: UIEvent) => any;
    }
    this.currentResults.push(resultDiv);
    resultDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();

      this.setSelection(id + 1);
      this.validateSelection(e);
    });
    resultDiv.addEventListener('contextmenu', (e) => {
      e.stopPropagation();
      if (e.ctrlKey && e.button === 0) {
        e.preventDefault();
        this.setSelection(id + 1);
        this.validateSelection(e);
      }
    });
    this.scrollDiv.appendChild(resultDiv);
  }

  private getDataFromResultDiv<K extends keyof IResult>(resultDiv: HTMLDivElement, key: K): IResult[K] | undefined {
    return JSON.parse(resultDiv.dataset.result ?? '{}')[key];
  }

  private getActionFromResultDiv(resultDiv: HTMLDivElement): IResult['action'] | undefined {
    return resultDiv.onabort as unknown as IResult['action'];
  }

  validateSelection(e: AllPossibleEvent) {
    if (!this.isIMEOpen) {
      this.currentResolver(e);
    }
  }

  defaultResolver(e: AllPossibleEvent) {
    if (e.getModifierState('Shift')) {
      this.input.value = '+' + this.input.value; // this resolver expects that the input starts with +
      this.createTiddlerResolver(e);
      return;
    }
    if (this.currentSelection === 0) return;
    const selectionTitle = this.getDataFromResultDiv(this.currentResults[this.currentSelection - 1], 'name');
    this.closePalette();
    this.navigateTo(selectionTitle);
  }

  /**
   * 调用 tm-navigate 跳转到标题对应的条目处
   */
  navigateTo(title?: string) {
    if (title) {
      this.parentWidget.dispatchEvent({
        type: 'tm-navigate',
        param: title,
        navigateTo: title,
      });
    }
  }

  showHistory() {
    this.hint.innerText = '历史记录';
    this.currentProvider = (terms: string) => {
      let results: string[];
      if (terms.length === 0) {
        results = this.getHistory();
      } else {
        if ($tw.utils.pinyinfuse) {
          results = $tw.utils.pinyinfuse(this.getHistory(), terms).map((item: { item: string }) => item.item);
        } else {
          results = this.getHistory().filter((item) => item.toLowerCase().includes(terms));
        }
      }
      this.showResults(
        results.map((title) => {
          return {
            name: title,
            action: () => {
              this.navigateTo(title);
              this.closePalette();
            },
          };
        }),
      );
    };

    this.currentResolver = (e: AllPossibleEvent) => {
      if (this.currentSelection === 0) return;
      this.getActionFromResultDiv(this.currentResults[this.currentSelection - 1])?.(e);
    };
    this.input.value = '';
    this.blockProviderChange = true;
    this.onInput(this.input.value);
  }

  setSelectionToFirst() {
    let sel = 1;
    if (this.allowInputFieldSelection || this.currentResults.length === 0) {
      sel = 0;
    }
    this.setSelection(sel);
  }

  setSelection(id: number) {
    this.currentSelection = id;
    for (let index = 0; index < this.currentResults.length; index++) {
      const selected = this.currentSelection === index + 1;
      this.currentResults[index].className = selected ? 'commandpaletteresult commandpaletteresultselected' : 'commandpaletteresult';
    }
    if (this.currentSelection === 0) {
      this.scrollDiv.scrollTop = 0;
      return;
    }
    const scrollHeight = this.scrollDiv.offsetHeight;
    const scrollPos = this.scrollDiv.scrollTop;
    const selectionPos = Number(this.currentResults[this.currentSelection - 1]?.offsetTop ?? 0);
    const selectionHeight = Number(this.currentResults[this.currentSelection - 1]?.offsetHeight ?? 0);

    if (selectionPos < scrollPos || selectionPos >= scrollPos + scrollHeight) {
      // select the closest scrolling position showing the selection
      let a = selectionPos;
      let b = selectionPos - scrollHeight + selectionHeight;
      a = Math.abs(a - scrollPos);
      b = Math.abs(b - scrollPos);
      if (a < b) {
        this.scrollDiv.scrollTop = selectionPos;
      } else {
        this.scrollDiv.scrollTop = selectionPos - scrollHeight + selectionHeight;
      }
    }
  }

  getHistory(): string[] {
    const historyData = $tw.wiki.getTiddlerData<Array<{ title: string }>>('$:/HistoryList') ?? [];
    const [first, second, ...rest] = uniq([...historyData.reverse().map((x) => x.title), ...$tw.wiki.filterTiddlers('[list[$:/StoryList]]')]).filter((t) =>
      this.tiddlerOrShadowExists(t),
    );
    // swap first and second, so its easier to switch to second, like using ctrl + tab in vscode
    return [second, first, ...rest];
  }

  tiddlerOrShadowExists(title: string) {
    return $tw.wiki.tiddlerExists(title) || $tw.wiki.isShadowTiddler(title);
  }

  /** This is opened when you click on the menu icon. */
  defaultProvider(terms: string) {
    this.hint.innerText = '⏎搜索条目（⇧⏎ 创建条目）（？问号查看帮助）';
    let searches: IResult[];
    if (terms.startsWith('\\')) terms = terms.substr(1);
    if (terms.length === 0) {
      if (this.settings.showHistoryOnOpen) {
        searches = this.getHistory().map((s) => {
          return { name: s, hint: '历史记录' };
        });
      } else {
        searches = [];
      }
    } else {
      searches = uniq(this.searchSteps.reduce((accumulator: IResult[], current) => [...accumulator, ...current(terms)], []));
    }
    this.showResults(searches);
  }

  searchStepBuilder(filter: string, caret: number, hint: string): (term: string) => IResult[] {
    return (terms: string) => {
      const search = filter.substring(0, caret) + terms + filter.substring(caret);

      const results = $tw.wiki.filterTiddlers(search).map((s) => {
        return { name: s, hint };
      });
      return results;
    };
  }

  tagListProvider(terms: string) {
    this.currentSelection = 0;
    this.hint.innerText = '搜索标签列表';
    let searches;
    if (terms.length === 0) {
      searches = $tw.wiki.filterTiddlers('[!is[system]tags[]][is[system]tags[]][all[shadows]tags[]]');
    } else {
      searches = $tw.wiki.filterTiddlers(
        $tw.utils.pinyinfuse
          ? `[all[]tags[]!is[system]pinyinfuse[${terms}]][all[]tags[]is[system]pinyinfuse[${terms}]][all[shadows]tags[]pinyinfuse[${terms}]]`
          : `[all[]tags[]!is[system]search[${terms}]][all[]tags[]is[system]search[${terms}]][all[shadows]tags[]search[${terms}]]`,
      );
    }
    searches = searches.map((s) => {
      return { name: s };
    });
    this.showResults(searches);
  }

  tagListResolver(_e: AllPossibleEvent) {
    if (this.currentSelection === 0) {
      const input = (this.input.value as string).substring(2);

      const exist = $tw.wiki.filterTiddlers('[tag[' + input + ']]');
      if (!exist) return;
      this.input.value = '##' + input;
      return;
    }
    const result = this.currentResults[this.currentSelection - 1];
    this.input.value = '##' + result.innerText;
    this.onInput(this.input.value);
  }

  tagProvider(terms: string) {
    this.currentSelection = 0;
    this.hint.innerText = '用「#标签 #标签2」搜索条目';
    let tiddlerNameSearchResults: string[] = [];
    if (terms.length > 0) {
      const { tags, searchTerms, tagsFilter } = this.parseTags(this.input.value);

      const taggedTiddlers: string[] = $tw.wiki.filterTiddlers(tagsFilter);

      if (taggedTiddlers.length > 0) {
        if (tags.length === 1) {
          const tag = tags[0];
          const tagTiddlerExists = this.tiddlerOrShadowExists(tag);
          if (tagTiddlerExists && searchTerms.some((s) => tag.includes(s))) tiddlerNameSearchResults.push(tag);
        }
        tiddlerNameSearchResults = [...tiddlerNameSearchResults, ...taggedTiddlers];
      }
    }
    this.showResults(
      tiddlerNameSearchResults.map((tiddlerName) => {
        return { name: tiddlerName };
      }),
    );
  }

  /**
   * @param input `'#aaa 1 #bbb#ccc'` => `['aaa', 'bbb#ccc']` and search `1`
   */
  parseTags(input: string) {
    const splits = input.split(' ').filter((s) => s !== '');
    const tags = [];
    const searchTerms = [];
    for (const split of splits) {
      // 空格分隔的结果可以以 # 开头，表示标签
      if (split.startsWith('#')) {
        tags.push(split.substr(1));
        continue;
      }
      // 也可以不带 # ，表示搜索词
      searchTerms.push(split);
    }
    let tagsFilter = `[all[tiddlers+system+shadows]${tags.reduce((a, c) => {
      return a + 'tag[' + c + ']';
    }, '')}]`;
    if (searchTerms.length > 0) {
      tagsFilter = tagsFilter.substring(0, tagsFilter.length - 1); // remove last ']'
      tagsFilter += `${$tw.utils.pinyinfuse ? 'pinyinfuse' : 'search'}[${searchTerms.join(' ')}]]`;
    }
    return { tags, searchTerms, tagsFilter };
  }

  settingsProvider(_terms: string) {
    this.currentSelection = 0;
    this.hint.innerText = 'Select the setting you want to change';
    const isNumerical: IValidator = (terms: string) => terms.length > 0 && terms.match(/\D/gm) === null;
    const isBoolean: IValidator = (terms: string) => terms.length > 0 && terms.match(/(true\b)|(false\b)/gim) !== null;
    this.showResults([
      { name: 'Theme (currently ' + this.settings.theme?.match?.(/[^/]*$/) ?? 'no ' + ')', action: () => this.promptForThemeSetting() },
      this.settingResultBuilder('Max results', 'maxResults', 'Choose the maximum number of results', isNumerical, 'Error: value must be a positive integer'),
      this.settingResultBuilder(
        'Show history on open',
        'showHistoryOnOpen',
        'Chose whether to show the history when you open the palette',
        isBoolean,
        "Error: value must be 'true' or 'false'",
      ),
      this.settingResultBuilder(
        'Escape to go back',
        'escapeGoesBack',
        'Chose whether ESC should go back when possible',
        isBoolean,
        "Error: value must be 'true' or 'false'",
      ),
      this.settingResultBuilder(
        'Use selection as search query',
        'alwaysPassSelection',
        'Chose your current selection is passed to the command palette',
        isBoolean,
        "Error: value must be 'true' or 'false'",
      ),
      this.settingResultBuilder(
        'Never Basic',
        'neverBasic',
        'Chose whether to override basic prompts to show filter operation',
        isBoolean,
        "Error: value must be 'true' or 'false'",
      ),
      this.settingResultBuilder(
        'Field preview max size',
        'maxResultHintSize',
        'Choose the maximum hint length for field preview',
        isNumerical,
        'Error: value must be a positive integer',
      ),
    ]);
  }

  settingResultBuilder<K extends keyof ISettings>(name: string, settingName: K, hint: string, validator: IValidator, errorMessage: string) {
    return { name: name + ' (currently ' + this.settings[settingName] + ')', action: () => this.promptForSetting(settingName, hint, validator, errorMessage) };
  }

  settingsResolver(e: AllPossibleEvent) {
    if (this.currentSelection === 0) return;
    this.goBack = () => {
      this.input.value = '|';
      this.blockProviderChange = false;
      this.onInput(this.input.value);
    };
    this.getActionFromResultDiv(this.currentResults[this.currentSelection - 1])?.(e);
  }

  promptForThemeSetting() {
    this.blockProviderChange = true;
    this.allowInputFieldSelection = false;
    this.currentProvider = (_terms: string) => {
      this.currentSelection = 0;
      this.hint.innerText = '选择一个主题';
      const defaultValue = this.defaultSettings.theme;
      const results = [
        {
          name: '恢复默认值: ' + defaultValue.match(/[^/]*$/),
          action: () => {
            this.setSetting('theme', defaultValue);
            // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 0.
            this.refreshThemes();
          },
        },
      ];
      for (const theme of this.themes) {
        const name = theme.fields.title;
        const shortName = name.match(/[^/]*$/);
        const action = () => {
          this.setSetting('theme', name);
          // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 0.
          this.refreshThemes();
        };
        results.push({ name: shortName, action });
      }
      this.showResults(results);
    };
    this.currentResolver = (e: AllPossibleEvent) => {
      this.getActionFromResultDiv(this.currentResults[this.currentSelection - 1])?.(e);
    };
    this.input.value = '';
    this.onInput(this.input.value);
  }

  promptForSetting<K extends keyof ISettings>(settingName: K, hint: string, validator: IValidator, errorMessage: string) {
    this.blockProviderChange = true;
    this.allowInputFieldSelection = true;
    this.currentProvider = (terms: string) => {
      this.currentSelection = 0;
      this.hint.innerText = hint;
      const defaultValue = this.defaultSettings[settingName];
      const results = [{ name: 'Revert to default value: ' + defaultValue, action: () => this.setSetting(settingName, defaultValue) }];
      if (!validator(terms)) {
        results.push({ name: errorMessage, action: () => {} });
      }
      this.showResults(results);
    };
    this.currentResolver = (e: AllPossibleEvent) => {
      if (this.currentSelection === 0) {
        const input = this.input.value;
        if (validator(input)) {
          this.setSetting(settingName, input);
          this.goBack = undefined;
          this.blockProviderChange = false;
          this.allowInputFieldSelection = false;
          this.promptCommand('|');
        }
      } else {
        const action = this.getActionFromResultDiv(this.currentResults[this.currentSelection - 1]);
        if (action != undefined) {
          action(e);
          this.goBack = undefined;
          this.blockProviderChange = false;
          this.allowInputFieldSelection = false;
          this.promptCommand('|');
        }
      }
    };
    this.input.value = this.settings[settingName];
    this.onInput(this.input.value);
  }

  showResults(results: IResult[]) {
    for (const current of this.currentResults) {
      current.remove();
    }
    this.currentResults = [];
    let resultCount = 0;
    for (const result of results) {
      this.addResult(result, resultCount);
      resultCount++;
      if (resultCount >= (this.settings.maxResults ?? this.defaultSettings.maxResults)) break;
    }
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'message' implicitly has an 'any' type.
  tmMessageBuilder(message, parameters = {}) {
    return (e: AllPossibleEvent) => {
      const event = {
        type: message,
        paramObject: parameters,
        event: e,
      };
      this.parentWidget.dispatchEvent(event);
    };
  }

  actionProvider(terms: string) {
    this.currentSelection = 0;
    this.hint.innerText = '查看和搜索命令列表';
    let results: IResult[];
    if (terms.length === 0) {
      results = this.getCommandHistory();
    } else {
      /**
       * $tw.utils.pinyinfuse: (xxx) => {
              item: T;
              refIndex: number;
              score?: number | undefined;
              matches?: readonly Fuse.FuseResultMatch[] | undefined;
          }[]
       */
      if ($tw.utils.pinyinfuse) {
        results = $tw.utils.pinyinfuse(this.actions, terms.toLowerCase(), ['name', 'caption']).map((item: { item: string }) => item.item);
      } else {
        results = this.actions.filter(
          (item) => item.name.toLowerCase().includes(terms.toLowerCase()) || item.caption?.toLowerCase()?.includes(terms.toLowerCase()),
        );
      }
    }
    this.showResults(results);
  }

  filterProvider(terms: string, hint?: string) {
    this.currentSelection = 0;
    this.hint.innerText = hint === undefined ? '筛选器语句' : hint;
    terms = '[' + terms;

    const fields = $tw.wiki.filterTiddlers('[fields[]]');

    const results = $tw.wiki.filterTiddlers(terms).map((r) => {
      return { name: r };
    });
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'i' implicitly has an 'any' type.
    const insertResult = (index, result) => results.splice(index + 1, 0, result);
    for (let index = 0; index < results.length; index++) {
      const initialResult = results[index];
      let alreadyMatched = false;
      let date = 'Invalid Date';
      if (initialResult.name.length === 17) {
        // to be sure to only match tiddly dates (17 char long)

        date = $tw.utils.parseDate(initialResult.name).toLocaleString();
      }
      if (date !== 'Invalid Date') {
        results[index].hint = date;
        results[index].action = () => {};
        alreadyMatched = true;
      }

      const isTag = $tw.wiki.getTiddlersWithTag(initialResult.name).length > 0;
      if (isTag) {
        if (alreadyMatched) {
          insertResult(index, { ...results[index] });
          index += 1;
        }
        results[index].action = () => this.promptCommand('#' + initialResult.name);
        results[index].hint = 'Tag'; // Todo more info?
        alreadyMatched = true;
      }
      const isTiddler = this.tiddlerOrShadowExists(initialResult.name);
      if (isTiddler) {
        if (alreadyMatched) {
          insertResult(index, { ...results[index] });
          index += 1;
        }
        results[index].action = () => {
          this.navigateTo(initialResult.name);
          this.closePalette();
        };
        results[index].hint = 'Tiddler';
        alreadyMatched = true;
      }
      const isField = fields.includes(initialResult.name);
      if (isField) {
        if (alreadyMatched) {
          insertResult(index, { ...results[index] });
          index += 1;
        }
        let parsed;
        try {
          parsed = $tw.wiki.parseFilter(this.input.value);
        } catch {} // The error is already displayed to the user
        const foundTitles = [];
        for (const node of parsed || []) {
          if (node.operators.length !== 2) continue;
          if (node.operators[0].operator === 'title' && node.operators[1].operator === 'fields') {
            foundTitles.push(node.operators[0].operand);
          }
        }
        let hint = 'Field';
        if (foundTitles.length === 1) {
          hint = $tw.wiki.getTiddler(foundTitles[0]).fields[initialResult.name];
          // @ts-expect-error ts-migrate(2358) FIXME: The left-hand side of an 'instanceof' expression m... Remove this comment to see the full error message
          if (hint instanceof Date) {
            hint = hint.toLocaleString();
          }
          hint = hint.toString().replace(/(\r\n|\n|\r)/gm, '');
          const maxSize = (this.settings.maxResultHintSize ?? this.defaultSettings.maxResultHintSize) - 3;
          if (hint.length > maxSize) {
            hint = hint.substring(0, maxSize);
            hint += '...';
          }
        }
        results[index].hint = hint;
        results[index].action = () => {};
        alreadyMatched = true;
      }
      // let isContentType = terms.includes('content-type');
    }
    this.showResults(results);
  }

  filterResolver(e: AllPossibleEvent) {
    if (this.currentSelection === 0) return;
    this.getActionFromResultDiv(this.currentResults[this.currentSelection - 1])?.(e);
    e.stopPropagation();
  }

  helpResolver(e: AllPossibleEvent) {
    if (this.currentSelection === 0) return;
    this.getActionFromResultDiv(this.currentResults[this.currentSelection - 1])?.(e);
    e.stopPropagation();
  }

  createTiddlerProvider(_terms: string) {
    this.currentSelection = 0;
    this.hint.innerText = '创建条目，空格隔开可以用#打多个标签';
    this.showResults([]);
  }

  createTiddlerResolver(e: AllPossibleEvent) {
    let { tags, searchTerms } = this.parseTags(this.input.value.substring(1));
    const title = searchTerms.join(' ');
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'any[]'.
    tags = tags.join(' ');
    this.tmMessageBuilder('tm-new-tiddler', { title, tags })(e);
    this.closePalette();
  }

  promptCommand(value: string, caret?: number) {
    this.blockProviderChange = false;
    this.input.value = value;
    this.input.focus();
    if (caret !== undefined) {
      this.input.setSelectionRange(caret, caret);
    }
    this.onInput(this.input.value);
  }

  promptCommandBasic(value: string, caret: number, hint: string) {
    // TODO: I delete this.settings.neverBasic === 'true' ||  here, see if cause bug
    if (this.settings.neverBasic === true) {
      // TODO: validate settings to avoid unnecessary checks
      this.promptCommand(value, caret);
      return;
    }
    this.input.value = '';
    this.blockProviderChange = true;
    this.currentProvider = this.basicProviderBuilder(value, caret, hint);
    this.onInput(this.input.value);
  }

  basicProviderBuilder(value: string, caret: number, hint: string) {
    const start = value.substr(0, caret);
    const end = value.substr(caret);
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'input' implicitly has an 'any' type.
    return (input) => {
      const { resolver, provider, terms } = this.parseCommand(start + input + end);
      const backgroundProvider = provider;
      backgroundProvider(terms, hint);
      this.currentResolver = resolver;
    };
  }

  getCommandHistory() {
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'h' implicitly has an 'any' type.
    this.history = this.history.filter((h) => this.actions.some((a) => a.name === h)); // get rid of deleted command that are still in history;
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'h' implicitly has an 'any' type.
    const results = this.history.map((h) => this.actions.find((a) => a.name === h));
    while (results.length <= (this.settings.maxResults ?? this.defaultSettings.maxResults)) {
      const nextDefaultAction = this.actions.find((a) => !results.includes(a));
      if (nextDefaultAction === undefined) break;
      results.push(nextDefaultAction);
    }
    return results;
  }

  actionResolver(e: AllPossibleEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (this.currentSelection === 0) return;
    const result = this.actions.find((a) => a.name === this.getDataFromResultDiv(this.currentResults[this.currentSelection - 1], 'name'));
    if (result == undefined) return;
    if (result.keepPalette) {
      const currentInput = this.input.value;
      this.goBack = () => {
        this.input.value = currentInput;
        this.blockProviderChange = false;
        this.onInput(this.input.value);
      };
    }
    this.updateCommandHistory(result);
    result.action?.(e);
    if (result.immediate) {
      this.validateSelection(e);
      return;
    }
    if (!result.keepPalette) {
      this.closePalette();
    }
  }

  getCurrentSelection() {
    // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
    const selection = window.getSelection().toString();
    if (selection !== '') return selection;
    const activeElement = this.getActiveElement();
    if (activeElement === undefined || activeElement.selectionStart === undefined) return '';
    if (activeElement.selectionStart > activeElement.selectionEnd) {
      return activeElement.value.substring(activeElement.selectionStart, activeElement.selectionEnd);
    } else {
      return activeElement.value.substring(activeElement.selectionEnd, activeElement.selectionStart);
    }
  }

  getActiveElement(element = document.activeElement): Element | null {
    // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
    const shadowRoot = element.shadowRoot;
    // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
    const contentDocument = element.contentDocument as Document;

    if (shadowRoot?.activeElement) {
      return this.getActiveElement(shadowRoot.activeElement);
    }

    if (contentDocument?.activeElement) {
      return this.getActiveElement(contentDocument.activeElement);
    }

    return element;
  }

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'el' implicitly has an 'any' type.
  focusAtCaretPosition(element, caretPos) {
    if (element !== null) {
      element.value = element.value;
      // ^ this is used to not only get "focus", but
      // to make sure we don't have it everything -selected-
      // (it causes an issue in chrome, and having it doesn't hurt any other browser)
      if (element.createTextRange) {
        const range = element.createTextRange();
        range.move('character', caretPos);
        range.select();
        return true;
      } else {
        // (el.selectionStart === 0 added for Firefox bug)
        if (element.selectionStart || element.selectionStart === 0) {
          element.focus();
          element.setSelectionRange(caretPos, caretPos);
          return true;
        } else {
          // fail city, fortunately this never happens (as far as I've tested) :)
          element.focus();
          return false;
        }
      }
    }
  }

  createElement<E extends keyof HTMLElementTagNameMap>(name: E, proprieties: any, styles?: Partial<CSSStyleDeclaration>): HTMLDivElement {
    const element = this.document.createElement(name) as HTMLDivElement;
    for (const [propriety, value] of Object.entries(proprieties || {})) {
      // @ts-expect-error ts-migrate(2304) FIXME: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type 'HTMLDivElement'. No index signature with a parameter of type 'string' was found on type 'HTMLDivElement'.ts(7053)
      element[propriety] = value;
    }
    for (const [style, value] of Object.entries(styles != undefined || {})) {
      element.style[style] = value;
    }
    return element;
  }

  /*
			Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
			*/
  refresh() {
    return false;
  }
}

exports.commandpalettewidget = CommandPaletteWidget;
