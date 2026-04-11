import {
  createContext, useContext, useReducer, useEffect,
  type ReactNode, type Dispatch,
} from "react";
import { api } from "../lib/api";

interface Document {
  id: string;
  title: string;
  content: string;
}

export interface Settings {
  shortcuts: Record<string, Record<string, string>>;
  theme: { theme: string; accentColor: string; fontFamily: string; fontSize: number };
  preferences: {
    editorMode: string; autoPunctuation: boolean;
    autoCapitalization: boolean; sidebarVisible: boolean;
    lastDocumentId: string | null;
  };
}

interface AppState {
  currentDocument: Document | null;
  settings: Settings | null;
  sidebarOpen: boolean;
  settingsPanelOpen: boolean;
  commandPaletteOpen: boolean;
  editorMode: "vim" | "modern";
  vimMode: "insert" | "normal";
  isDirty: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  wordCount: number;
  cursorLine: number;
  cursorCol: number;
  pendingInsertMode: boolean;
}

type Action =
  | { type: "SET_DOCUMENT"; payload: Document | null }
  | { type: "SET_SETTINGS"; payload: Settings }
  | { type: "UPDATE_CONTENT"; payload: string }
  | { type: "SET_TITLE"; payload: string }
  | { type: "TOGGLE_SIDEBAR" }
  | { type: "TOGGLE_SETTINGS_PANEL" }
  | { type: "TOGGLE_COMMAND_PALETTE" }
  | { type: "SET_EDITOR_MODE"; payload: "vim" | "modern" }
  | { type: "SET_VIM_MODE"; payload: "insert" | "normal" }
  | { type: "SET_DIRTY"; payload: boolean }
  | { type: "SET_SAVE_STATUS"; payload: "idle" | "saving" | "saved" | "error" }
  | { type: "SET_WORD_COUNT"; payload: number }
  | { type: "SET_CURSOR"; payload: { line: number; col: number } }
  | { type: "SET_PENDING_INSERT_MODE"; payload: boolean };

const initialState: AppState = {
  currentDocument: null, settings: null, sidebarOpen: true,
  settingsPanelOpen: false, commandPaletteOpen: false,
  editorMode: "vim", vimMode: "normal", isDirty: false,
  saveStatus: "idle", wordCount: 0, cursorLine: 1, cursorCol: 1,
  pendingInsertMode: false,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_DOCUMENT":
      return { ...state, currentDocument: action.payload, isDirty: false, saveStatus: "idle" };
    case "SET_SETTINGS": {
      const s = action.payload;
      return { ...state, settings: s,
        editorMode: (s.preferences.editorMode as "vim" | "modern") || "vim",
        sidebarOpen: s.preferences.sidebarVisible,
      };
    }
    case "UPDATE_CONTENT":
      return state.currentDocument
        ? { ...state, currentDocument: { ...state.currentDocument, content: action.payload }, isDirty: true, saveStatus: "idle" }
        : state;
    case "SET_TITLE":
      return state.currentDocument
        ? { ...state, currentDocument: { ...state.currentDocument, title: action.payload } }
        : state;
    case "TOGGLE_SIDEBAR": return { ...state, sidebarOpen: !state.sidebarOpen };
    case "TOGGLE_SETTINGS_PANEL": return { ...state, settingsPanelOpen: !state.settingsPanelOpen };
    case "TOGGLE_COMMAND_PALETTE": return { ...state, commandPaletteOpen: !state.commandPaletteOpen };
    case "SET_EDITOR_MODE": return { ...state, editorMode: action.payload };
    case "SET_VIM_MODE": return { ...state, vimMode: action.payload };
    case "SET_DIRTY": return { ...state, isDirty: action.payload };
    case "SET_SAVE_STATUS": return { ...state, saveStatus: action.payload };
    case "SET_WORD_COUNT": return { ...state, wordCount: action.payload };
    case "SET_CURSOR": return { ...state, cursorLine: action.payload.line, cursorCol: action.payload.col };
    case "SET_PENDING_INSERT_MODE": return { ...state, pendingInsertMode: action.payload };
    default: return state;
  }
}

const AppContext = createContext<AppState>(initialState);
const DispatchContext = createContext<Dispatch<Action>>(() => {});

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    api.settings.get().then((settings) => {
      dispatch({ type: "SET_SETTINGS", payload: settings });
    });
  }, []);

  useEffect(() => {
    const lastId = state.settings?.preferences.lastDocumentId;
    if (lastId) {
      api.files.open(lastId).then((doc) => {
        dispatch({ type: "SET_DOCUMENT", payload: doc });
      }).catch(() => {});
    }
  }, [state.settings?.preferences.lastDocumentId]);

  return (
    <AppContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </AppContext.Provider>
  );
}

export function useAppState() { return useContext(AppContext); }
export function useAppDispatch() { return useContext(DispatchContext); }
