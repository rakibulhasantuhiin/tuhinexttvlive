/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Routes, Route } from 'react-router-dom';
import UserView from './components/UserView';
import AdminView from './components/AdminView';

export default function App() {
  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden flex flex-col">
      <Routes>
        <Route path="/" element={<UserView />} />
        <Route path="/admin" element={<AdminView />} />
      </Routes>
    </div>
  );
}
