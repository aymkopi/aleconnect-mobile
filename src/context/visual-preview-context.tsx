import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import { PANELUI_PREVIEW } from '@/constants/panelui-preview';
const Context = createContext({ fixtures: false, guestFixtures: false, publicFixtures: false, setFixtures: (_value: boolean) => {}, setGuestFixtures: (_value: boolean) => {} });
export function VisualPreviewProvider({ children }: PropsWithChildren) {
  const [fixtures, setPrivateFixtures] = useState(false);
  const [guestFixtures, setPublicFixtures] = useState(false);
  return <Context.Provider value={{
    fixtures: PANELUI_PREVIEW && fixtures, guestFixtures: PANELUI_PREVIEW && guestFixtures,
    publicFixtures: PANELUI_PREVIEW && (fixtures || guestFixtures),
    setFixtures: (value) => { setPrivateFixtures(value); setPublicFixtures(false); },
    setGuestFixtures: (value) => { setPrivateFixtures(false); setPublicFixtures(value); },
  }}>{children}</Context.Provider>;
}
export function useVisualPreview() { return useContext(Context); }
