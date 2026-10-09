export type ThemeMode = "system" | "light" | "dark";
export function applyTheme(m: ThemeMode) {
  localStorage.setItem("fita-theme", m);
  const el = document.documentElement;
  el.classList.remove("light", "dark");
  if (m !== "system") el.classList.add(m);
}
export const themeInitScript = `try{var m=localStorage.getItem('fita-theme');if(m==='light'||m==='dark')document.documentElement.classList.add(m)}catch(e){}`;
