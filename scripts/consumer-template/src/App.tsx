import * as React from 'react';
import { BstTableMui } from '@bloomskill/table-mui';
import { BstTableShadcn } from '@bloomskill/table-shadcn';
import { createTheme, ThemeProvider } from '@mui/material/styles';

import '@bloomskill/table-engine/styles.css';
import '@bloomskill/table-shadcn/styles.css';

import type { BstTableColumn } from '@bloomskill/table-engine';
type Row = { id: string; name: string; age: number; role: string | null; active: boolean };
const seed: Row[] = [
  { id: '1', name: 'Charlie', age: 30, role: 'admin', active: true },
  { id: '2', name: 'Alice', age: 25, role: 'user', active: false },
  { id: '3', name: 'Bob', age: 40, role: 'user', active: true },
];
const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', sortFn: 'basic', meta: { type: 'text', editable: true } },
  {
    id: 'age',
    accessorKey: 'age',
    header: 'Age',
    sortFn: 'basic',
    meta: { type: 'number', editable: true, cellMeta: { required: true } },
  },
  {
    id: 'role',
    accessorKey: 'role',
    header: 'Role',
    meta: {
      type: 'singleSelect',
      editable: true,
      options: [
        { value: 'admin', label: 'Admin', color: '#ef4444' },
        { value: 'user', label: 'User' },
      ],
    },
  },
  { id: 'active', accessorKey: 'active', header: 'Active', meta: { type: 'boolean', editable: true } },
  { id: 'actions', header: '', meta: { type: 'action', actions: { edit: true, delete: true, duplicate: true } } },
];

export default function App() {
  const [dataMui, setDataMui] = React.useState<Row[]>(seed);
  const [dataSc, setDataSc] = React.useState<Row[]>(seed);
  return (
    <ThemeProvider theme={createTheme()}>
      <h2>Consumed from published @bloomskill/* tarballs (Phase 2: editing)</h2>
      <BstTableMui
        title="MUI"
        data={dataMui}
        columns={columns}
        getRowId={(r) => r.id}
        enableEditing
        enableValidation
        enableRowActions
        onDataChange={setDataMui}
      />
      <BstTableShadcn
        title="shadcn"
        data={dataSc}
        columns={columns}
        getRowId={(r) => r.id}
        enableEditing
        enableValidation
        enableRowActions
        onDataChange={setDataSc}
      />
    </ThemeProvider>
  );
}
