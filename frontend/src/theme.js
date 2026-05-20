import { theme } from 'antd';

// Палитра как в макете: глубокий чёрный фон, чуть приподнятые карточки,
// фиолетовый акцент, мятный success, мягкий красный для минусов.
export const appTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#a78bfa',         // violet-400
    colorInfo: '#a78bfa',
    colorSuccess: '#22c55e',
    colorError: '#f87171',
    colorWarning: '#f59e0b',

    colorBgBase: '#0b0b0f',
    colorBgLayout: '#0b0b0f',
    colorBgContainer: '#16161d',
    colorBgElevated: '#1c1c25',

    colorBorder: 'rgba(255,255,255,0.08)',
    colorBorderSecondary: 'rgba(255,255,255,0.06)',

    colorTextBase: '#e7e7ea',
    colorTextSecondary: '#9b9bab',
    colorTextTertiary: '#7b7b8c',

    borderRadius: 12,
    borderRadiusLG: 16,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  components: {
    Layout: {
      bodyBg: '#0b0b0f',
      headerBg: '#0b0b0f',
      siderBg: '#0d0d14',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(167, 139, 250, 0.16)',
      darkItemHoverBg: 'rgba(255, 255, 255, 0.04)',
      darkItemSelectedColor: '#c4b5fd',
    },
    Card: {
      colorBgContainer: '#16161d',
      borderRadiusLG: 16,
    },
    Table: {
      headerBg: 'transparent',
      headerColor: '#9b9bab',
      rowHoverBg: 'rgba(255,255,255,0.03)',
      borderColor: 'rgba(255,255,255,0.06)',
    },
    Button: {
      borderRadius: 10,
    },
    Tag: {
      borderRadiusSM: 999,
    },
    Modal: {
      contentBg: '#16161d',
      headerBg: '#16161d',
    },
    Drawer: {
      colorBgElevated: '#16161d',
    },
  },
};
