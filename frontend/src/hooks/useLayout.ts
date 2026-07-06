import { useState, useSyncExternalStore } from 'react'
import { isChatSection } from '../lib/chatUtils'
import type { SidebarView } from '../components/layout/Sidebar'

export type MobilePane = 'sidebar' | 'list' | 'detail'

const MOBILE_MAX = '(max-width: 767px)'
const TABLET_RANGE = '(min-width: 768px) and (max-width: 1023px)'

/**
 * Subscribe to a media query via the platform's own change events. Unlike a
 * `resize` listener reading `innerWidth`, this only notifies React when the
 * query result actually flips — so dragging the window edge no longer triggers
 * a render on every pixel, and there is no first-paint width guess to flash.
 */
function useMediaQuery(query: string): boolean {
	const subscribe = (onChange: () => void) => {
		if (typeof window === 'undefined') return () => {}
		const mql = window.matchMedia(query)
		mql.addEventListener('change', onChange)
		return () => mql.removeEventListener('change', onChange)
	}
	const getSnapshot = () =>
		typeof window !== 'undefined' && window.matchMedia(query).matches
	const getServerSnapshot = () => false
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function useLayout(activeView: SidebarView) {
	const isMobile = useMediaQuery(MOBILE_MAX)
	const isTablet = useMediaQuery(TABLET_RANGE)
	const isDesktop = !isMobile && !isTablet

	const [mobilePaneState, setMobilePane] = useState<MobilePane>('detail')
	const [isSidebarDrawerOpenState, setIsSidebarDrawerOpen] = useState(false)
	const [isDesktopSidebarCollapsedState, setIsDesktopSidebarCollapsed] = useState(false)

	// Note: the mobile drawer is force-reported closed on desktop via the derived
	// `isSidebarDrawerOpen` below, so no effect is needed to reconcile on resize.
	return {
		isMobile,
		isTablet,
		isDesktop,
		mobilePane: isMobile && isChatSection(activeView) ? mobilePaneState : 'detail',
		setMobilePane,
		isSidebarDrawerOpen: isDesktop ? false : isSidebarDrawerOpenState,
		setIsSidebarDrawerOpen,
		isDesktopSidebarCollapsed: isDesktop ? isDesktopSidebarCollapsedState : false,
		setIsDesktopSidebarCollapsed,
	}
}
