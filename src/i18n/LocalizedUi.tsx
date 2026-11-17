import { useTx } from "./uiText";

/** Reactive text for shared controls, including screen-reader labels. */
export function LocalizedUi({ text }: { text: string }) {
  const tx = useTx();
  return <>{tx(text)}</>;
}