import { lexMPD } from "./lexer.js";
const SUPPORTED_VERSION = "1.0";
export function parseMPD(source) {
    const lexed = lexMPD(source);
    const parser = new MPDParser(source, lexed.tokens, lexed.diagnostics);
    const ast = parser.parseProgram();
    const diagnostics = parser.diagnostics;
    if (ast) {
        diagnostics.push(...validateAST(ast));
    }
    return { ast, diagnostics };
}
class MPDParser {
    constructor(source, tokens, diagnostics) {
        this.source = source;
        this.tokens = tokens;
        this.index = 0;
        this.diagnostics = diagnostics.slice();
    }
    parseProgram() {
        const start = this.peek();
        if (!this.consumeKeyword("mpd")) {
            return null;
        }
        const version = this.parseVersion();
        if (!version) {
            return null;
        }
        const body = [];
        if (this.matchKeyword("deck")) {
            const deck = this.parseDeck();
            if (deck) {
                body.push(deck);
            }
        }
        else {
            while (!this.isAtEnd()) {
                const item = this.parseTopLevelItem();
                if (!item) {
                    break;
                }
                body.push(item);
            }
        }
        const end = this.previous();
        return {
            type: "Program",
            version: version.value,
            body,
            span: spanFrom(start, end)
        };
    }
    parseDeck() {
        const start = this.consumeKeyword("deck");
        if (!start) {
            return null;
        }
        const name = this.parseOptionalName();
        const { items, end } = this.parseBlock(() => this.parseDeckItem());
        return {
            type: "Deck",
            name: name ?? undefined,
            items,
            span: spanFrom(start, end)
        };
    }
    parseTopLevelItem() {
        return this.parseDeckItemInternal(true);
    }
    parseDeckItem() {
        return this.parseDeckItemInternal(false);
    }
    parseDeckItemInternal(reportErrors) {
        if (this.isAtEnd()) {
            return null;
        }
        const token = this.peek();
        if (token.type === "keyword") {
            const handler = MPDParser.KEYWORD_ITEM_PARSERS[token.value];
            if (handler) {
                return handler(this);
            }
        }
        if (token.type === "identifier") {
            return this.parseUnknownBlock();
        }
        if (reportErrors) {
            this.error(token, "top-level declaration");
        }
        return null;
    }
    parseUnknownBlock() {
        const nameToken = this.consume("identifier");
        if (!nameToken) {
            return null;
        }
        const brace = this.consumePunct("{");
        if (!brace) {
            return null;
        }
        let depth = 1;
        while (!this.isAtEnd() && depth > 0) {
            const token = this.peek();
            if (token.type === "punct" && token.value === "{") {
                depth += 1;
            }
            else if (token.type === "punct" && token.value === "}") {
                depth -= 1;
            }
            this.advance();
        }
        const end = this.previous();
        const content = this.source.slice(brace.start.offset, end.end.offset);
        return {
            type: "UnknownBlock",
            name: nameToken.value,
            content,
            span: spanFrom(nameToken, end)
        };
    }
    parseMetaDecl() {
        const start = this.consumeKeyword("meta");
        if (!start) {
            return null;
        }
        const items = [];
        this.consumePunct("{");
        while (!this.isAtEnd() && !this.matchPunct("}")) {
            const entry = this.parseMetaEntry();
            if (entry) {
                items.push(entry);
            }
            if (this.matchPunct(",")) {
                this.consumePunct(",");
            }
        }
        const end = this.consumePunct("}") ?? this.previous();
        return {
            type: "MetaDecl",
            entries: items,
            span: spanFrom(start, end)
        };
    }
    parseMetaEntry() {
        const key = this.consume("identifier");
        if (!key) {
            return null;
        }
        this.consumePunct(":");
        const value = this.parseExpr();
        if (!value) {
            return null;
        }
        return {
            type: "MetaEntry",
            key: key.value,
            value,
            span: spanFrom(key, this.previous())
        };
    }
    parseConstDecl() {
        const start = this.consumeKeyword("let");
        if (!start) {
            return null;
        }
        const name = this.consume("identifier");
        if (!name) {
            return null;
        }
        this.consumePunct("=");
        const value = this.parseExpr();
        this.consumePunct(";");
        return {
            type: "ConstDecl",
            name: name.value,
            value: value ?? this.emptyLiteral(name),
            span: spanFrom(start, this.previous())
        };
    }
    parsePluginDecl() {
        const start = this.consumeKeyword("use");
        if (!start) {
            return null;
        }
        const ref = this.parseName();
        let options;
        if (this.peek().type === "punct" && this.peek().value === "{") {
            options = this.parseObjectExpr();
        }
        this.consumePunct(";");
        return {
            type: "PluginDecl",
            ref,
            options,
            span: spanFrom(start, this.previous())
        };
    }
    parseDiagramDecl() {
        const start = this.consumeKeyword("diagram");
        if (!start) {
            return null;
        }
        const id = this.parseName();
        const { items, end } = this.parseBlock(() => this.parseDiagramItem());
        return {
            type: "DiagramDecl",
            id,
            items: items.filter((item) => item !== null),
            span: spanFrom(start, end)
        };
    }
    parseDiagramItem() {
        const token = this.peek();
        if (token.type === "keyword") {
            switch (token.value) {
                case "mermaid":
                    return this.parseMermaidSourceDecl();
                case "config":
                    return this.parseMermaidConfigDecl();
                case "assets":
                    return this.parseDiagramAssetsDecl();
                case "meta":
                    return this.parseMetaDecl();
                default:
                    break;
            }
        }
        return null;
    }
    parseMermaidSourceDecl() {
        const start = this.consumeKeyword("mermaid");
        if (!start) {
            return null;
        }
        const heredocToken = this.consume("heredoc");
        if (!heredocToken || !heredocToken.heredoc) {
            return null;
        }
        this.consumePunct(";");
        return {
            type: "MermaidSourceDecl",
            source: heredocToken.heredoc.body,
            tag: heredocToken.heredoc.tag,
            span: spanFrom(start, this.previous())
        };
    }
    parseMermaidConfigDecl() {
        const start = this.consumeKeyword("config");
        if (!start) {
            return null;
        }
        const config = this.parseObjectExpr();
        this.consumePunct(";");
        return {
            type: "MermaidConfigDecl",
            config,
            span: spanFrom(start, this.previous())
        };
    }
    parseDiagramAssetsDecl() {
        const start = this.consumeKeyword("assets");
        if (!start) {
            return null;
        }
        const assets = this.parseObjectExpr();
        this.consumePunct(";");
        return {
            type: "DiagramAssetsDecl",
            assets,
            span: spanFrom(start, this.previous())
        };
    }
    parseRuntimeDecl() {
        const start = this.consumeKeyword("runtime");
        if (!start) {
            return null;
        }
        const { items, end } = this.parseBlock(() => this.parseRuntimeItem());
        return {
            type: "RuntimeDecl",
            items: items.filter((item) => item !== null),
            span: spanFrom(start, end)
        };
    }
    parseRuntimeItem() {
        const token = this.peek();
        if (token.type === "keyword") {
            switch (token.value) {
                case "camera":
                    return this.parseCameraDecl();
                case "overlay":
                    return this.parseOverlayDecl();
                case "navigation":
                    return this.parseNavigationDecl();
                case "performance":
                    return this.parsePerformanceDecl();
                case "meta":
                    return this.parseMetaDecl();
                default:
                    break;
            }
        }
        return null;
    }
    parseCameraDecl() {
        const start = this.consumeKeyword("camera");
        if (!start) {
            return null;
        }
        const { items, end } = this.parseBlock(() => this.parseCameraItem());
        return {
            type: "CameraDecl",
            items: items.filter((item) => item !== null),
            span: spanFrom(start, end)
        };
    }
    parseCameraItem() {
        if (this.matchKeyword("engine")) {
            const start = this.consumeKeyword("engine");
            this.consumePunct(":");
            const name = this.parseName();
            this.consumePunct(";");
            return {
                type: "CameraEngine",
                name,
                span: spanFrom(start, this.previous())
            };
        }
        if (this.matchKeyword("options")) {
            const start = this.consumeKeyword("options");
            this.consumePunct(":");
            const options = this.parseObjectExpr();
            this.consumePunct(";");
            return {
                type: "CameraOptions",
                options,
                span: spanFrom(start, this.previous())
            };
        }
        if (this.matchKeyword("bounds")) {
            const start = this.consumeKeyword("bounds");
            this.consumePunct(":");
            const boundsToken = this.consume("keyword");
            const bounds = (boundsToken?.value ?? "viewport");
            this.consumePunct(";");
            return {
                type: "CameraBounds",
                bounds,
                span: spanFrom(start, this.previous())
            };
        }
        return null;
    }
    parseOverlayDecl() {
        const start = this.consumeKeyword("overlay");
        if (!start) {
            return null;
        }
        const { items, end } = this.parseBlock(() => this.parseOverlayItem());
        return {
            type: "OverlayDecl",
            items: items.filter((item) => item !== null),
            span: spanFrom(start, end)
        };
    }
    parseOverlayItem() {
        if (this.matchKeyword("engine")) {
            const start = this.consumeKeyword("engine");
            this.consumePunct(":");
            const name = this.parseName();
            this.consumePunct(";");
            return {
                type: "OverlayEngine",
                name,
                span: spanFrom(start, this.previous())
            };
        }
        if (this.matchKeyword("options")) {
            const start = this.consumeKeyword("options");
            this.consumePunct(":");
            const options = this.parseObjectExpr();
            this.consumePunct(";");
            return {
                type: "OverlayOptions",
                options,
                span: spanFrom(start, this.previous())
            };
        }
        return null;
    }
    parseNavigationDecl() {
        const start = this.consumeKeyword("navigation");
        if (!start) {
            return null;
        }
        const { items, end } = this.parseBlock(() => this.parseNavigationItem());
        return {
            type: "NavigationDecl",
            items: items.filter((item) => item !== null),
            span: spanFrom(start, end)
        };
    }
    parseNavigationItem() {
        if (this.matchKeyword("keys")) {
            const start = this.consumeKeyword("keys");
            this.consumePunct(":");
            const options = this.parseObjectExpr();
            this.consumePunct(";");
            return {
                type: "NavigationKeys",
                options,
                span: spanFrom(start, this.previous())
            };
        }
        if (this.matchKeyword("wheelZoom")) {
            const start = this.consumeKeyword("wheelZoom");
            this.consumePunct(":");
            const value = this.parseBoolean();
            this.consumePunct(";");
            return {
                type: "NavigationWheelZoom",
                value,
                span: spanFrom(start, this.previous())
            };
        }
        if (this.matchKeyword("dragPan")) {
            const start = this.consumeKeyword("dragPan");
            this.consumePunct(":");
            const value = this.parseBoolean();
            this.consumePunct(";");
            return {
                type: "NavigationDragPan",
                value,
                span: spanFrom(start, this.previous())
            };
        }
        if (this.matchKeyword("tapToAdvance")) {
            const start = this.consumeKeyword("tapToAdvance");
            this.consumePunct(":");
            const value = this.parseBoolean();
            this.consumePunct(";");
            return {
                type: "NavigationTapToAdvance",
                value,
                span: spanFrom(start, this.previous())
            };
        }
        if (this.matchKeyword("progressUI")) {
            const start = this.consumeKeyword("progressUI");
            this.consumePunct(":");
            const value = this.parseBoolean();
            this.consumePunct(";");
            return {
                type: "NavigationProgressUI",
                value,
                span: spanFrom(start, this.previous())
            };
        }
        if (this.matchKeyword("startAt")) {
            const start = this.consumeKeyword("startAt");
            this.consumePunct(":");
            const valueToken = this.peek();
            let value = 0;
            if (valueToken.type === "int" || valueToken.type === "number") {
                this.advance();
                value = Number(valueToken.value);
            }
            else if (valueToken.type === "string") {
                this.advance();
                value = valueToken.value;
            }
            else {
                this.error(valueToken, "number or string");
            }
            this.consumePunct(";");
            return {
                type: "NavigationStartAt",
                value,
                span: spanFrom(start, this.previous())
            };
        }
        return null;
    }
    parsePerformanceDecl() {
        const start = this.consumeKeyword("performance");
        if (!start) {
            return null;
        }
        const options = this.parseObjectExpr();
        this.consumePunct(";");
        return {
            type: "PerformanceDecl",
            options,
            span: spanFrom(start, this.previous())
        };
    }
    parseSelectorsDecl() {
        const start = this.consumeKeyword("selectors");
        if (!start) {
            return null;
        }
        const { items, end } = this.parseBlock(() => this.parseSelectorsItem());
        return {
            type: "SelectorsDecl",
            items: items.filter((item) => item !== null),
            span: spanFrom(start, end)
        };
    }
    parseSelectorsItem() {
        if (this.matchKeyword("strategy")) {
            const start = this.consumeKeyword("strategy");
            this.consumePunct(":");
            const strategyToken = this.consume("keyword");
            const strategy = (strategyToken?.value ?? "css");
            this.consumePunct(";");
            return {
                type: "SelectorsStrategy",
                strategy,
                span: spanFrom(start, this.previous())
            };
        }
        if (this.matchKeyword("fallback")) {
            const start = this.consumeKeyword("fallback");
            this.consumePunct(":");
            const fallback = this.parseArrayExpr();
            this.consumePunct(";");
            return {
                type: "SelectorsFallback",
                fallback,
                span: spanFrom(start, this.previous())
            };
        }
        if (this.matchKeyword("node")) {
            const start = this.consumeKeyword("node");
            this.consumePunct(":");
            const spec = this.parseObjectExpr();
            this.consumePunct(";");
            return {
                type: "SelectorsNode",
                spec,
                span: spanFrom(start, this.previous())
            };
        }
        if (this.matchKeyword("edge")) {
            const start = this.consumeKeyword("edge");
            this.consumePunct(":");
            const spec = this.parseObjectExpr();
            this.consumePunct(";");
            return {
                type: "SelectorsEdge",
                spec,
                span: spanFrom(start, this.previous())
            };
        }
        if (this.matchKeyword("subgraph")) {
            const start = this.consumeKeyword("subgraph");
            this.consumePunct(":");
            const spec = this.parseObjectExpr();
            this.consumePunct(";");
            return {
                type: "SelectorsSubgraph",
                spec,
                span: spanFrom(start, this.previous())
            };
        }
        if (this.matchKeyword("meta")) {
            return this.parseMetaDecl();
        }
        return null;
    }
    parseStylesDecl() {
        const start = this.consumeKeyword("styles");
        if (!start) {
            return null;
        }
        const { items, end } = this.parseBlock(() => this.parseStylesItem());
        return {
            type: "StylesDecl",
            items: items.filter((item) => item !== null),
            span: spanFrom(start, end)
        };
    }
    parseStylesItem() {
        if (this.matchKeyword("classes")) {
            const start = this.consumeKeyword("classes");
            this.consumePunct(":");
            const classes = this.parseObjectExpr();
            this.consumePunct(";");
            return {
                type: "StylesClasses",
                classes,
                span: spanFrom(start, this.previous())
            };
        }
        if (this.matchKeyword("spotlight")) {
            const start = this.consumeKeyword("spotlight");
            this.consumePunct(":");
            const spotlight = this.parseObjectExpr();
            this.consumePunct(";");
            return {
                type: "StylesSpotlight",
                spotlight,
                span: spanFrom(start, this.previous())
            };
        }
        if (this.matchKeyword("theme")) {
            const start = this.consumeKeyword("theme");
            this.consumePunct(":");
            const theme = this.parseName();
            this.consumePunct(";");
            return {
                type: "StylesTheme",
                theme,
                span: spanFrom(start, this.previous())
            };
        }
        if (this.matchKeyword("meta")) {
            return this.parseMetaDecl();
        }
        return null;
    }
    parseSceneDecl() {
        const start = this.consumeKeyword("scene");
        if (!start) {
            return null;
        }
        const name = this.parseName();
        let diagram;
        if (this.matchKeyword("diagram")) {
            this.consumeKeyword("diagram");
            diagram = this.parseName();
        }
        const { items, end } = this.parseBlock(() => this.parseSceneItem());
        return {
            type: "SceneDecl",
            name,
            diagram,
            items: items.filter((item) => item !== null),
            span: spanFrom(start, end)
        };
    }
    parseSceneItem() {
        const token = this.peek();
        if (token.type === "keyword") {
            switch (token.value) {
                case "step":
                    return this.parseStepDecl();
                case "binding":
                    return this.parseBindingDecl();
                case "meta":
                    return this.parseMetaDecl();
                case "let":
                    return this.parseConstDecl();
                default:
                    break;
            }
        }
        return null;
    }
    parseStepDecl() {
        const start = this.consumeKeyword("step");
        if (!start) {
            return null;
        }
        const name = this.parseName();
        let alias;
        if (this.matchKeyword("as")) {
            this.consumeKeyword("as");
            const ident = this.consume("identifier");
            alias = ident?.value;
        }
        const { items, end } = this.parseBlock(() => this.parseStepStmt());
        return {
            type: "StepDecl",
            name,
            alias,
            statements: items.filter((item) => item !== null),
            span: spanFrom(start, end)
        };
    }
    parseStepStmt() {
        const token = this.peek();
        if (token.type === "keyword") {
            switch (token.value) {
                case "focus":
                    return this.parseFocusStmt();
                case "do":
                    return this.parseDoStmt();
                case "let":
                    return this.parseLetStmt();
                case "assert":
                    return this.parseAssertStmt();
                case "meta":
                    return this.parseMetaDecl();
                default:
                    break;
            }
        }
        // Support bare action calls without "do" keyword (new syntax)
        // e.g., "camera reset()" instead of "do camera.reset()"
        // Note: Action calls can start with keywords (like "camera") or identifiers
        if (token.type === "identifier" || token.type === "keyword") {
            // Don't consume keywords that are step statement keywords
            if (token.type === "keyword" && (token.value === "focus" || token.value === "let" || token.value === "assert" || token.value === "meta")) {
                return null;
            }
            const action = this.parseActionCall();
            if (action) {
                return {
                    type: "DoStmt",
                    action,
                    span: action.span
                };
            }
        }
        return null;
    }
    parseFocusStmt() {
        const start = this.consumeKeyword("focus");
        if (!start) {
            return null;
        }
        const target = this.parseTargetExpr();
        const options = {};
        while (true) {
            if (this.matchKeyword("pad")) {
                this.consumeKeyword("pad");
                const value = this.parseNumber();
                options.pad = value;
                continue;
            }
            if (this.matchKeyword("align")) {
                this.consumeKeyword("align");
                const alignToken = this.consume("keyword");
                options.align = (alignToken?.value ?? "center");
                continue;
            }
            if (this.matchKeyword("lock")) {
                this.consumeKeyword("lock");
                const lockToken = this.consume("keyword");
                options.lock = (lockToken?.value ?? "none");
                continue;
            }
            if (this.matchKeyword("id")) {
                this.consumeKeyword("id");
                const ident = this.consume("identifier");
                if (ident) {
                    options.id = ident.value;
                }
                continue;
            }
            break;
        }
        this.consumePunct(";");
        return {
            type: "FocusStmt",
            target: target ?? this.emptyTarget(start),
            options,
            span: spanFrom(start, this.previous())
        };
    }
    parseDoStmt() {
        const start = this.consumeKeyword("do");
        if (!start) {
            return null;
        }
        const action = this.parseActionCall();
        this.consumePunct(";");
        return {
            type: "DoStmt",
            action: action ?? this.emptyAction(start),
            span: spanFrom(start, this.previous())
        };
    }
    parseLetStmt() {
        const start = this.consumeKeyword("let");
        if (!start) {
            return null;
        }
        const name = this.consume("identifier");
        this.consumePunct("=");
        const value = this.parseExpr();
        this.consumePunct(";");
        return {
            type: "LetStmt",
            name: name?.value ?? "",
            value: value ?? this.emptyLiteral(start),
            span: spanFrom(start, this.previous())
        };
    }
    parseAssertStmt() {
        const start = this.consumeKeyword("assert");
        if (!start) {
            return null;
        }
        const condition = this.parseExpr();
        let message;
        if (this.matchKeyword("else")) {
            this.consumeKeyword("else");
            const messageToken = this.consume("string");
            message = messageToken?.value;
        }
        this.consumePunct(";");
        return {
            type: "AssertStmt",
            condition: condition ?? this.emptyLiteral(start),
            message,
            span: spanFrom(start, this.previous())
        };
    }
    parseBindingDecl() {
        const start = this.consumeKeyword("binding");
        if (!start) {
            return null;
        }
        let name;
        if (this.peek().type === "identifier" || this.peek().type === "string") {
            name = this.parseName();
        }
        let priority;
        if (this.matchKeyword("priority")) {
            this.consumeKeyword("priority");
            const value = this.consume("int");
            priority = value ? Number(value.value) : undefined;
            this.consumePunct(";");
        }
        const { items, end } = this.parseBlock(() => this.parseBindingRule());
        return {
            type: "BindingDecl",
            name,
            priority,
            rules: items.filter((item) => item !== null),
            span: spanFrom(start, end)
        };
    }
    parseBindingRule() {
        const start = this.consumeKeyword("on");
        if (!start) {
            return null;
        }
        const event = this.parseEventSpec();
        let target;
        if (this.matchKeyword("target")) {
            this.consumeKeyword("target");
            if (this.matchKeyword("any")) {
                this.consumeKeyword("any");
                target = "any";
            }
            else {
                target = this.parseTargetExpr() ?? undefined;
            }
        }
        let when;
        if (this.matchKeyword("when")) {
            this.consumeKeyword("when");
            when = this.parseExpr() ?? undefined;
        }
        const { items, end } = this.parseBlock(() => this.parseBindingStmt());
        return {
            type: "BindingRule",
            event: event ?? this.emptyEvent(start),
            target,
            when,
            statements: items.filter((item) => item !== null),
            span: spanFrom(start, end)
        };
    }
    parseBindingStmt() {
        if (this.matchKeyword("do")) {
            return this.parseDoStmt();
        }
        if (this.matchKeyword("let")) {
            return this.parseLetStmt();
        }
        if (this.matchKeyword("assert")) {
            return this.parseAssertStmt();
        }
        return null;
    }
    parseEventSpec() {
        const token = this.consume("keyword");
        if (!token) {
            return null;
        }
        if (token.value === "key") {
            const keyToken = this.consume("string");
            return {
                type: "EventSpec",
                kind: "key",
                value: keyToken?.value,
                span: spanFrom(token, this.previous())
            };
        }
        if (token.value === "timer") {
            const durationToken = this.consume("duration");
            return {
                type: "EventSpec",
                kind: "timer",
                value: durationToken ? parseDuration(durationToken.value) : undefined,
                span: spanFrom(token, this.previous())
            };
        }
        if (token.value === "custom") {
            const name = this.parseName();
            return {
                type: "EventSpec",
                kind: "custom",
                value: name.value,
                span: spanFrom(token, this.previous())
            };
        }
        return {
            type: "EventSpec",
            kind: token.value,
            span: spanFrom(token, token)
        };
    }
    parseActionCall() {
        const start = this.peek();
        // Parse space-separated action names (e.g., "camera reset", "overlay bubble")
        // Support both old dot notation (camera.reset) and new space notation (camera reset)
        const nameParts = [];
        // Parse first part (required)
        const firstPart = this.consumeNamePart();
        if (!firstPart) {
            return null;
        }
        nameParts.push(firstPart.value);
        // Parse additional parts separated by dots or spaces
        while (!this.isAtEnd()) {
            // Handle dot-separated names (old syntax: camera.reset)
            if (this.matchPunct(".")) {
                this.consumePunct(".");
                const part = this.consumeNamePart();
                if (part) {
                    nameParts.push(part.value);
                }
                continue;
            }
            // Handle space-separated names (new syntax: camera reset)
            // Peek at current token to see if it's an identifier or keyword
            const token = this.peek();
            if (token.type === "identifier" || token.type === "keyword") {
                const nextToken = this.peekNext();
                // If next token is "(", this is the last part of the name
                if (nextToken.type === "punct" && nextToken.value === "(") {
                    const part = this.consumeNamePart();
                    if (part) {
                        nameParts.push(part.value);
                    }
                    break;
                }
                // Otherwise, continue consuming name parts
                const part = this.consumeNamePart();
                if (part) {
                    nameParts.push(part.value);
                }
                continue;
            }
            // Stop if we hit anything else
            break;
        }
        this.consumePunct("(");
        const args = [];
        if (!this.matchPunct(")")) {
            do {
                const arg = this.parseActionArg();
                if (arg) {
                    args.push(arg);
                }
            } while (this.matchPunct(",") && this.advance());
        }
        this.consumePunct(")");
        return {
            type: "ActionCall",
            name: nameParts.join(" "),
            args,
            span: spanFrom(start, this.previous())
        };
    }
    parseActionArg() {
        const start = this.peek();
        // Allow both identifiers and keywords as argument names (e.g., target:, text:, padding:)
        const token = this.peek();
        if ((token.type === "identifier" || token.type === "keyword") && this.peekNext().type === "punct" && this.peekNext().value === ":") {
            // Consume the key (identifier or keyword)
            const key = this.advance();
            this.consumePunct(":");
            const value = this.parseExpr();
            return {
                type: "ActionArg",
                key: key?.value,
                value: value ?? this.emptyLiteral(start),
                span: spanFrom(start, this.previous())
            };
        }
        const value = this.parseExpr();
        return {
            type: "ActionArg",
            value: value ?? this.emptyLiteral(start),
            span: spanFrom(start, this.previous())
        };
    }
    parseExpr() {
        return this.parseOrExpr();
    }
    parseOrExpr() {
        let expr = this.parseAndExpr();
        while (this.matchKeyword("or")) {
            const operator = this.consumeKeyword("or");
            const right = this.parseAndExpr();
            expr = {
                type: "BinaryExpr",
                operator: "or",
                left: expr ?? this.emptyLiteral(operator),
                right: right ?? this.emptyLiteral(operator),
                span: spanFrom(operator, this.previous())
            };
        }
        return expr;
    }
    parseAndExpr() {
        let expr = this.parseEqExpr();
        while (this.matchKeyword("and")) {
            const operator = this.consumeKeyword("and");
            const right = this.parseEqExpr();
            expr = {
                type: "BinaryExpr",
                operator: "and",
                left: expr ?? this.emptyLiteral(operator),
                right: right ?? this.emptyLiteral(operator),
                span: spanFrom(operator, this.previous())
            };
        }
        return expr;
    }
    parseEqExpr() {
        let expr = this.parseRelExpr();
        while (this.matchOperator("==") || this.matchOperator("!=")) {
            const op = this.consume("operator");
            const right = this.parseRelExpr();
            expr = {
                type: "BinaryExpr",
                operator: op.value,
                left: expr ?? this.emptyLiteral(op),
                right: right ?? this.emptyLiteral(op),
                span: spanFrom(op, this.previous())
            };
        }
        return expr;
    }
    parseRelExpr() {
        let expr = this.parseAddExpr();
        while (this.matchOperator("<") || this.matchOperator("<=") || this.matchOperator(">") || this.matchOperator(">=")) {
            const op = this.consume("operator");
            const right = this.parseAddExpr();
            expr = {
                type: "BinaryExpr",
                operator: op.value,
                left: expr ?? this.emptyLiteral(op),
                right: right ?? this.emptyLiteral(op),
                span: spanFrom(op, this.previous())
            };
        }
        return expr;
    }
    parseAddExpr() {
        let expr = this.parseMulExpr();
        while (this.matchOperator("+") || this.matchOperator("-")) {
            const op = this.consume("operator");
            const right = this.parseMulExpr();
            expr = {
                type: "BinaryExpr",
                operator: op.value,
                left: expr ?? this.emptyLiteral(op),
                right: right ?? this.emptyLiteral(op),
                span: spanFrom(op, this.previous())
            };
        }
        return expr;
    }
    parseMulExpr() {
        let expr = this.parseUnaryExpr();
        while (this.matchOperator("*") || this.matchOperator("/") || this.matchOperator("%")) {
            const op = this.consume("operator");
            const right = this.parseUnaryExpr();
            expr = {
                type: "BinaryExpr",
                operator: op.value,
                left: expr ?? this.emptyLiteral(op),
                right: right ?? this.emptyLiteral(op),
                span: spanFrom(op, this.previous())
            };
        }
        return expr;
    }
    parseUnaryExpr() {
        if (this.matchOperator("!") || this.matchOperator("-")) {
            const operator = this.consume("operator");
            const argument = this.parseUnaryExpr();
            return {
                type: "UnaryExpr",
                operator: operator.value,
                argument: argument ?? this.emptyLiteral(operator),
                span: spanFrom(operator, this.previous())
            };
        }
        return this.parsePrimaryExpr();
    }
    parsePrimaryExpr() {
        const token = this.peek();
        if (token.type === "number" || token.type === "int" || token.type === "duration" || token.type === "percent" || token.type === "boolean" || token.type === "null" || token.type === "string" || token.type === "color") {
            this.advance();
            return this.literalFromToken(token);
        }
        if (token.type === "punct" && token.value === "{") {
            return this.parseObjectExpr();
        }
        if (token.type === "punct" && token.value === "[") {
            return this.parseArrayExpr();
        }
        if (token.type === "punct" && token.value === "(") {
            const start = this.consumePunct("(");
            const expr = this.parseExpr();
            this.consumePunct(")");
            return expr ? { ...expr, span: spanFrom(start, this.previous()) } : null;
        }
        if (token.type === "punct" && token.value === "$") {
            return this.parseVarRef();
        }
        if (this.isTargetKeyword(token)) {
            return this.parseTargetExpr();
        }
        if (token.type === "identifier") {
            return this.parseCallExpr();
        }
        return null;
    }
    parseVarRef() {
        const start = this.consumePunct("$");
        const path = [];
        const root = this.consume("identifier");
        if (root) {
            path.push(root.value);
        }
        while (this.matchPunct(".")) {
            this.consumePunct(".");
            const segment = this.consume("identifier");
            if (segment) {
                path.push(segment.value);
            }
        }
        return {
            type: "VarRef",
            path,
            span: spanFrom(start, this.previous())
        };
    }
    parseCallExpr() {
        const start = this.peek();
        const name = this.consume("identifier");
        if (!name) {
            return null;
        }
        this.consumePunct("(");
        const args = [];
        if (!this.matchPunct(")")) {
            do {
                const arg = this.parseActionArg();
                if (arg) {
                    args.push(arg);
                }
            } while (this.matchPunct(",") && this.advance());
        }
        this.consumePunct(")");
        return {
            type: "CallExpr",
            name: name.value,
            args,
            span: spanFrom(start, this.previous())
        };
    }
    parseObjectExpr() {
        const start = this.consumePunct("{");
        const entries = [];
        if (!this.matchPunct("}")) {
            do {
                // Allow both identifiers and strings as object keys (for JSON compatibility)
                const token = this.peek();
                const key = (token.type === "identifier" || token.type === "keyword") ? this.advance() : this.consume("string");
                if (!key) {
                    break;
                }
                this.consumePunct(":");
                const value = this.parseExpr();
                // For string keys, remove the quotes
                const keyValue = key.type === "string" ? key.value.slice(1, -1) : key.value;
                entries.push({
                    type: "ObjectEntry",
                    key: keyValue,
                    value: value ?? this.emptyLiteral(key),
                    span: spanFrom(key, this.previous())
                });
            } while (this.matchPunct(",") && this.advance());
        }
        this.consumePunct("}");
        return {
            type: "ObjectExpr",
            entries,
            span: spanFrom(start, this.previous())
        };
    }
    parseArrayExpr() {
        const start = this.consumePunct("[");
        const items = [];
        if (!this.matchPunct("]")) {
            do {
                const value = this.parseExpr();
                if (value) {
                    items.push(value);
                }
            } while (this.matchPunct(",") && this.advance());
        }
        this.consumePunct("]");
        return {
            type: "ArrayExpr",
            items,
            span: spanFrom(start, this.previous())
        };
    }
    parseTargetExpr() {
        const next = this.peek();
        if (!this.isTargetKeyword(next)) {
            this.error(next, "target expression");
            return null;
        }
        const token = this.consume("keyword");
        if (!token) {
            return null;
        }
        switch (token.value) {
            case "node":
                return this.parseTargetUnary(token, "TargetNode", () => this.parseNodeRef());
            case "edge":
                return this.parseTargetUnary(token, "TargetEdge", () => this.parseEdgeRef());
            case "subgraph":
                return this.parseTargetUnary(token, "TargetSubgraph", () => this.parseSubgraphRef());
            case "css":
                return this.parseTargetString(token, "TargetCss");
            case "id":
                return this.parseTargetString(token, "TargetId");
            case "text":
                return this.parseTargetString(token, "TargetText");
            case "group":
                return this.parseTargetList(token, "TargetGroup");
            case "union":
                return this.parseTargetList(token, "TargetUnion");
            case "intersect":
                return this.parseTargetList(token, "TargetIntersect");
            case "except":
                return this.parseTargetExcept(token);
            default:
                return null;
        }
    }
    parseTargetUnary(start, type, parser) {
        this.consumePunct("(");
        const ref = parser();
        this.consumePunct(")");
        return {
            type,
            ref,
            span: spanFrom(start, this.previous())
        };
    }
    parseTargetString(start, type) {
        this.consumePunct("(");
        const value = this.consume("string");
        this.consumePunct(")");
        const textValue = value?.value ?? "";
        if (type === "TargetCss") {
            return {
                type: "TargetCss",
                selector: textValue,
                span: spanFrom(start, this.previous())
            };
        }
        if (type === "TargetId") {
            return {
                type: "TargetId",
                id: textValue,
                span: spanFrom(start, this.previous())
            };
        }
        return {
            type: "TargetText",
            text: textValue,
            span: spanFrom(start, this.previous())
        };
    }
    parseTargetList(start, type) {
        this.consumePunct("(");
        const targets = [];
        if (!this.matchPunct(")")) {
            do {
                const target = this.parseTargetExpr();
                if (target) {
                    targets.push(target);
                }
            } while (this.matchPunct(",") && this.advance());
        }
        this.consumePunct(")");
        const node = {
            type: type,
            targets,
            span: spanFrom(start, this.previous())
        };
        return node;
    }
    parseTargetExcept(start) {
        this.consumePunct("(");
        const left = this.parseTargetExpr();
        this.consumePunct(",");
        const right = this.parseTargetExpr();
        this.consumePunct(")");
        return {
            type: "TargetExcept",
            left: left ?? this.emptyTarget(start),
            right: right ?? this.emptyTarget(start),
            span: spanFrom(start, this.previous())
        };
    }
    parseNodeRef() {
        if (this.matchOperator("*")) {
            this.consume("operator");
            return "*";
        }
        if (this.peek().type === "string") {
            const str = this.consume("string");
            return this.makeName(str);
        }
        const ident = this.consume("identifier");
        return ident ? this.makeName(ident) : "*";
    }
    parseEdgeRef() {
        const firstToken = this.peek();
        const from = this.parseNodeRef();
        if (this.matchPunct(",")) {
            this.consumePunct(",");
            const to = this.parseNodeRef();
            return { from, to };
        }
        if (from === "*") {
            return {
                type: "Name",
                value: "*",
                kind: "identifier",
                span: spanFrom(firstToken, this.previous())
            };
        }
        return from;
    }
    parseSubgraphRef() {
        if (this.matchOperator("*")) {
            this.consume("operator");
            return "*";
        }
        if (this.peek().type === "string") {
            const str = this.consume("string");
            return this.makeName(str);
        }
        const ident = this.consume("identifier");
        return ident ? this.makeName(ident) : "*";
    }
    parseQualifiedName() {
        const parts = [];
        const first = this.consumeNamePart();
        if (first) {
            parts.push(first.value);
        }
        while (this.matchPunct(".")) {
            this.consumePunct(".");
            const next = this.consumeNamePart();
            if (next) {
                parts.push(next.value);
            }
        }
        return parts.join(".");
    }
    consumeNamePart() {
        const token = this.peek();
        if (token.type === "identifier" || token.type === "keyword") {
            return this.advance();
        }
        this.error(token, "identifier");
        return null;
    }
    parseName() {
        const token = this.peek();
        if (token.type === "string") {
            this.advance();
            return {
                type: "Name",
                value: token.value,
                kind: "string",
                span: spanFrom(token, token)
            };
        }
        const ident = this.consume("identifier");
        return {
            type: "Name",
            value: ident?.value ?? "",
            kind: "identifier",
            span: spanFrom(ident ?? token, this.previous())
        };
    }
    parseOptionalName() {
        const token = this.peek();
        if (token.type === "identifier" || token.type === "string") {
            return this.parseName();
        }
        return null;
    }
    parseNumber() {
        const token = this.consume("number") ?? this.consume("int");
        return token ? Number(token.value) : 0;
    }
    parseBoolean() {
        const token = this.consume("boolean");
        return token ? token.value === "true" : false;
    }
    parseVersion() {
        const start = this.consume("number") ?? this.consume("int");
        if (!start) {
            return null;
        }
        const parts = [start.value];
        while (this.matchPunct(".")) {
            this.consumePunct(".");
            const part = this.consume("number") ?? this.consume("int");
            if (!part) {
                break;
            }
            parts.push(part.value);
        }
        return { value: parts.join("."), end: this.previous() };
    }
    parseBlock(parser) {
        const items = [];
        const start = this.consumePunct("{");
        while (!this.isAtEnd() && !this.matchPunct("}")) {
            const item = parser();
            if (item) {
                items.push(item);
            }
            else {
                this.advance();
            }
        }
        const end = this.consumePunct("}") ?? this.previous();
        return { items, end: end ?? start };
    }
    literalFromToken(token) {
        const raw = token.value;
        if (token.type === "boolean") {
            return {
                type: "Literal",
                literalType: "boolean",
                value: token.value === "true",
                raw,
                span: spanFrom(token, token)
            };
        }
        if (token.type === "null") {
            return {
                type: "Literal",
                literalType: "null",
                value: null,
                raw,
                span: spanFrom(token, token)
            };
        }
        if (token.type === "string") {
            return {
                type: "Literal",
                literalType: "string",
                value: token.value,
                raw,
                span: spanFrom(token, token)
            };
        }
        if (token.type === "color") {
            return {
                type: "Literal",
                literalType: "color",
                value: token.value,
                raw,
                span: spanFrom(token, token)
            };
        }
        if (token.type === "duration") {
            return {
                type: "Literal",
                literalType: "duration",
                value: parseDuration(token.value),
                raw,
                span: spanFrom(token, token)
            };
        }
        if (token.type === "percent") {
            return {
                type: "Literal",
                literalType: "percent",
                value: Number(token.value.replace("%", "")),
                raw,
                span: spanFrom(token, token)
            };
        }
        return {
            type: "Literal",
            literalType: token.type === "int" ? "int" : "number",
            value: Number(token.value),
            raw,
            span: spanFrom(token, token)
        };
    }
    emptyLiteral(token) {
        return {
            type: "Literal",
            literalType: "null",
            value: null,
            raw: "null",
            span: spanFrom(token, token)
        };
    }
    emptyTarget(token) {
        return {
            type: "TargetNode",
            ref: "*",
            span: spanFrom(token, token)
        };
    }
    emptyAction(token) {
        return {
            type: "ActionCall",
            name: "",
            args: [],
            span: spanFrom(token, token)
        };
    }
    emptyEvent(token) {
        return {
            type: "EventSpec",
            kind: "click",
            span: spanFrom(token, token)
        };
    }
    makeName(token) {
        return {
            type: "Name",
            value: token.value,
            kind: token.type === "string" ? "string" : "identifier",
            span: spanFrom(token, token)
        };
    }
    isTargetKeyword(token) {
        return token.type === "keyword" && ["node", "edge", "subgraph", "css", "id", "text", "group", "union", "intersect", "except"].includes(token.value);
    }
    matchKeyword(value) {
        const token = this.peek();
        return token.type === "keyword" && token.value === value;
    }
    matchOperator(value) {
        const token = this.peek();
        return token.type === "operator" && token.value === value;
    }
    matchPunct(value) {
        const token = this.peek();
        return token.type === "punct" && token.value === value;
    }
    consumeKeyword(value) {
        const token = this.peek();
        if (token.type === "keyword" && token.value === value) {
            return this.advance();
        }
        this.error(token, `keyword '${value}'`);
        return null;
    }
    consumePunct(value) {
        const token = this.peek();
        if (token.type === "punct" && token.value === value) {
            return this.advance();
        }
        this.error(token, `symbol '${value}'`);
        return null;
    }
    consume(type) {
        const token = this.peek();
        if (token.type === type) {
            return this.advance();
        }
        this.error(token, type);
        return null;
    }
    error(token, expected) {
        if (token.type === "eof") {
            this.diagnostics.push({
                message: `Unexpected end of input, expected ${expected}.`,
                severity: "error",
                span: spanFrom(token, token),
                code: "parse/unexpected-eof"
            });
            return;
        }
        this.diagnostics.push({
            message: `Unexpected '${token.image || token.value}', expected ${expected}.`,
            severity: "error",
            span: spanFrom(token, token),
            code: "parse/unexpected-token"
        });
    }
    advance() {
        if (!this.isAtEnd()) {
            this.index += 1;
        }
        return this.tokens[this.index - 1];
    }
    peek() {
        return this.tokens[this.index];
    }
    peekNext() {
        return this.tokens[this.index + 1];
    }
    previous() {
        return this.tokens[Math.max(0, this.index - 1)];
    }
    isAtEnd() {
        return this.peek().type === "eof";
    }
}
MPDParser.KEYWORD_ITEM_PARSERS = {
    diagram: (parser) => parser.parseDiagramDecl(),
    runtime: (parser) => parser.parseRuntimeDecl(),
    selectors: (parser) => parser.parseSelectorsDecl(),
    styles: (parser) => parser.parseStylesDecl(),
    let: (parser) => parser.parseConstDecl(),
    scene: (parser) => parser.parseSceneDecl(),
    binding: (parser) => parser.parseBindingDecl(),
    use: (parser) => parser.parsePluginDecl(),
    meta: (parser) => parser.parseMetaDecl()
};
function spanFrom(start, end) {
    return {
        start: start.start,
        end: end.end
    };
}
function parseDuration(value) {
    if (value.endsWith("ms")) {
        return Number(value.replace("ms", ""));
    }
    if (value.endsWith("s")) {
        return Number(value.replace("s", "")) * 1000;
    }
    if (value.endsWith("m")) {
        return Number(value.replace("m", "")) * 60000;
    }
    return Number(value);
}
function validateAST(ast) {
    const diagnostics = [];
    if (ast.version !== SUPPORTED_VERSION && ast.version !== "1") {
        diagnostics.push({
            message: `MPD version '${ast.version}' differs from supported version ${SUPPORTED_VERSION}.`,
            severity: "warning",
            span: ast.span,
            code: "validate/version-mismatch"
        });
    }
    for (const item of ast.body) {
        if (item.type === "SceneDecl") {
            const seen = new Set();
            for (const stmt of item.items) {
                if (stmt.type === "StepDecl") {
                    const name = stmt.name.value;
                    if (seen.has(name)) {
                        diagnostics.push({
                            message: `Duplicate step name '${name}' in scene '${item.name.value}'.`,
                            severity: "error",
                            span: stmt.span,
                            code: "validate/duplicate-step"
                        });
                    }
                    else {
                        seen.add(name);
                    }
                }
            }
        }
        if (item.type === "UnknownBlock") {
            diagnostics.push({
                message: `Unknown block '${item.name}'.`,
                severity: "warning",
                span: item.span,
                code: "validate/unknown-block"
            });
        }
    }
    const visitExpr = (expr) => {
        switch (expr.type) {
            case "TargetEdge": {
                const ref = expr.ref;
                if (typeof ref === "object" && (ref.from === "*" || ref.to === "*")) {
                    diagnostics.push({
                        message: "Edge target cannot use '*' in edge tuple.",
                        severity: "error",
                        span: expr.span,
                        code: "validate/malformed-target"
                    });
                }
                break;
            }
            case "TargetCss":
            case "TargetId":
            case "TargetText": {
                const value = expr.selector ?? expr.id ?? expr.text ?? "";
                if (!value) {
                    diagnostics.push({
                        message: "Target string cannot be empty.",
                        severity: "error",
                        span: expr.span,
                        code: "validate/malformed-target"
                    });
                }
                break;
            }
            case "TargetGroup":
            case "TargetUnion":
            case "TargetIntersect":
                expr.targets.forEach(visitExpr);
                break;
            case "TargetExcept":
                visitExpr(expr.left);
                visitExpr(expr.right);
                break;
            case "BinaryExpr":
                visitExpr(expr.left);
                visitExpr(expr.right);
                break;
            case "UnaryExpr":
                visitExpr(expr.argument);
                break;
            case "ObjectExpr":
                expr.entries.forEach((entry) => visitExpr(entry.value));
                break;
            case "ArrayExpr":
                expr.items.forEach(visitExpr);
                break;
            case "CallExpr":
                expr.args.forEach((arg) => visitExpr(arg.value));
                break;
            case "Literal":
            case "VarRef":
            case "TargetNode":
            case "TargetSubgraph":
                break;
            default:
                break;
        }
    };
    const visitNode = (node) => {
        if (!node || typeof node !== "object") {
            return;
        }
        const typed = node;
        switch (typed.type) {
            case "StepDecl": {
                const step = node;
                step.statements.forEach(visitNode);
                break;
            }
            case "SceneDecl": {
                const scene = node;
                scene.items.forEach(visitNode);
                break;
            }
            case "FocusStmt":
                visitExpr(node.target);
                break;
            case "LetStmt":
                visitExpr(node.value);
                break;
            case "AssertStmt":
                visitExpr(node.condition);
                break;
            case "DoStmt":
                node.action.args.forEach((arg) => visitExpr(arg.value));
                break;
            case "BindingDecl":
                node.rules.forEach(visitNode);
                break;
            case "BindingRule": {
                const rule = node;
                if (rule.when) {
                    visitExpr(rule.when);
                }
                rule.statements.forEach(visitNode);
                break;
            }
            case "ConstDecl":
                visitExpr(node.value);
                break;
            case "MetaDecl":
                node.entries.forEach((entry) => visitExpr(entry.value));
                break;
            default:
                break;
        }
    };
    ast.body.forEach(visitNode);
    return diagnostics;
}
//# sourceMappingURL=parser.js.map