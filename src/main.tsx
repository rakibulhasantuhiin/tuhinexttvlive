import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import SpatialNavigation from 'spatial-navigation-js';
import App from './App.tsx';
import './index.css';

SpatialNavigation.init();
SpatialNavigation.add({
  selector: 'button, a, input, [tabindex]'
});
SpatialNavigation.makeFocusable();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
