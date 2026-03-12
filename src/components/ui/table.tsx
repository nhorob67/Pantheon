"use client";

import React, { type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from "react";

interface TableProps extends HTMLAttributes<HTMLTableElement> {
  className?: string;
}

function Table({ className = "", children, ...rest }: TableProps) {
  return (
    <table
      className={["w-full border-collapse", className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </table>
  );
}

Table.displayName = "Table";

interface TableHeadProps extends HTMLAttributes<HTMLTableSectionElement> {
  className?: string;
}

function TableHead({ className = "", children, ...rest }: TableHeadProps) {
  return (
    <thead className={className} {...rest}>
      {children}
    </thead>
  );
}

TableHead.displayName = "TableHead";

interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {
  className?: string;
}

function TableBody({ className = "", children, ...rest }: TableBodyProps) {
  return (
    <tbody className={className} {...rest}>
      {children}
    </tbody>
  );
}

TableBody.displayName = "TableBody";

interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  className?: string;
}

function TableRow({ className = "", children, ...rest }: TableRowProps) {
  return (
    <tr
      className={["hover:bg-muted/50 transition-colors", className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </tr>
  );
}

TableRow.displayName = "TableRow";

interface TableHeaderCellProps extends ThHTMLAttributes<HTMLTableCellElement> {
  className?: string;
}

function TableHeaderCell({ className = "", children, ...rest }: TableHeaderCellProps) {
  return (
    <th
      className={[
        "text-left text-xs font-semibold text-foreground/60 uppercase tracking-wider px-4 py-3 border-b border-border",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </th>
  );
}

TableHeaderCell.displayName = "TableHeaderCell";

interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  className?: string;
}

function TableCell({ className = "", children, ...rest }: TableCellProps) {
  return (
    <td
      className={["px-4 py-3 text-sm border-b border-border", className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </td>
  );
}

TableCell.displayName = "TableCell";

export {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
  type TableProps,
  type TableHeadProps,
  type TableBodyProps,
  type TableRowProps,
  type TableCellProps,
  type TableHeaderCellProps,
};
