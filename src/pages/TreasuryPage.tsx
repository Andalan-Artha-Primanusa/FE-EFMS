import React from "react";
import { TreasuryShell } from "./treasury/TreasuryShell";

export function TreasuryPage(props: {
  viewTitle?: string;
  query?: string;
  onNotice?: (msg: string) => void;
  user?: any;
}) {
  return (
    <TreasuryShell
      viewTitle={props.viewTitle ?? "Treasury Management"}
      query={props.query ?? ""}
      onNotice={props.onNotice}
      user={props.user}
    />
  );
}
