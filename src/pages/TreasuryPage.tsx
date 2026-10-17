import React from "react";
import { TreasuryShell } from "./treasury/TreasuryShell";
import type { TreasuryTab } from "../data/navigation";

export function TreasuryPage(props: {
  viewTitle?: string;
  tab: TreasuryTab;
  query?: string;
  onNotice?: (msg: string) => void;
  user?: any;
}) {
  return (
    <TreasuryShell
      viewTitle={props.viewTitle ?? "Treasury Management"}
      tab={props.tab}
      query={props.query ?? ""}
      onNotice={props.onNotice}
      user={props.user}
    />
  );
}
