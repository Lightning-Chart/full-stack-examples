import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

window.__IS_LOCAL_MODE__ = import.meta.env.DEV;

document.addEventListener('click', function(event: MouseEvent) {
	const target = event.target as HTMLElement | null;
	const link = target?.closest('a');
    
	if (link && link.href) {
		if (link.host !== window.location.host) {
			link.setAttribute('target', '_blank');
			link.setAttribute('rel', 'noopener noreferrer');
		}
	}
});

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<App />
	</StrictMode>,
)
