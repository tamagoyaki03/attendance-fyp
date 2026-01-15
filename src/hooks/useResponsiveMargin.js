import { useEffect } from "react";

export const useResponsiveMargin = () => {
  useEffect(() => {
    const updateMargin = () => {
      const sidebarOpen = JSON.parse(localStorage.getItem("sidebarOpen") ?? "true");
      const mainElements = document.querySelectorAll("main[data-has-sidebar]");
      mainElements.forEach((el) => {
        el.style.marginLeft = sidebarOpen ? "250px" : "80px";
      });
    };

    updateMargin();
    window.addEventListener("sidebar-toggle", updateMargin);
    window.addEventListener("storage", updateMargin);

    return () => {
      window.removeEventListener("sidebar-toggle", updateMargin);
      window.removeEventListener("storage", updateMargin);
    };
  }, []);
};
