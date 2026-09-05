(function () {
  const lang = document.documentElement.lang === "bs" ? "bs" : "en";
  const data = window.PORTFOLIO || {};
  const projectData = (data.projects && data.projects[lang]) || {};
  const certData = (data.certs && data.certs[lang]) || {};

  let currentProjectImages = [];
  let currentImageIndex = 0;
  let allCertsExpanded = false;

  function $(id) {
    return document.getElementById(id);
  }

  function formatGithubDate(value) {
    if (!value) return "";
    return new Intl.DateTimeFormat(lang === "bs" ? "bs-BA" : "en-US", {
      dateStyle: "medium",
    }).format(new Date(value));
  }

  async function loadGithubActivity() {
    const section = $("github-activity");
    if (!section) return;

    const status = $("github-activity-status");
    const content = $("github-activity-content");
    const error = $("github-activity-error");
    const username = "Saban2412";
    const apiBase = "https://api.github.com";
    const cacheBust = Date.now();

    async function githubRequest(path) {
      const separator = path.includes("?") ? "&" : "?";
      const response = await fetch(
        `${apiBase}${path}${separator}_=${cacheBust}`,
        {
          cache: "no-store",
          headers: {
            Accept: "application/vnd.github+json",
          },
        },
      );
      if (!response.ok)
        throw new Error(`github-request-failed-${response.status}`);
      return response.json();
    }

    try {
      const events = await githubRequest(
        `/users/${username}/events/public?per_page=100`,
      );
      const pushEvent = events
        .filter(
          (event) =>
            event.type === "PushEvent" &&
            event.actor?.login?.toLowerCase() === username.toLowerCase() &&
            event.repo?.name,
        )
        .sort(
          (first, second) =>
            new Date(second.created_at) - new Date(first.created_at),
        )[0];
      if (!pushEvent) throw new Error("no-public-push");

      const repo = await githubRequest(`/repos/${pushEvent.repo.name}`);
      const commits = await githubRequest(
        `/repos/${pushEvent.repo.name}/commits?per_page=5`,
      );
      if (!Array.isArray(commits) || !commits.length) {
        throw new Error("no-commits");
      }

      $("github-activity-repo").textContent = repo.full_name || repo.name;
      $("github-activity-language").textContent =
        repo.language || (lang === "bs" ? "Nije navedeno" : "Not specified");
      $("github-activity-repo-link").href = repo.html_url;
      $("github-activity-repo-link").setAttribute(
        "aria-label",
        `${repo.full_name || repo.name} ${lang === "bs" ? "na GitHubu" : "on GitHub"}`,
      );

      const commitList = $("github-activity-commits");
      commitList.replaceChildren();
      commits.slice(0, 5).forEach((commit) => {
        const item = document.createElement("li");
        item.className = "github-commit-item";

        const link = document.createElement("a");
        link.href = commit.html_url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.className = "github-commit-link";

        const message = document.createElement("span");
        message.className = "github-commit-message";
        message.textContent =
          commit.commit?.message?.split("\n")[0] ||
          (lang === "bs" ? "Bez poruke commita" : "Commit without a message");

        const date = document.createElement("time");
        date.className = "github-commit-date";
        date.dateTime = commit.commit?.author?.date || "";
        date.textContent = formatGithubDate(commit.commit?.author?.date);

        link.append(message, date);
        item.append(link);
        commitList.append(item);
      });

      status.classList.add("hidden");
      error.classList.add("hidden");
      content.classList.remove("hidden");
    } catch (requestError) {
      console.error("Unable to load GitHub activity", requestError);
      status.classList.add("hidden");
      content.classList.add("hidden");
      error.classList.remove("hidden");
    }
  }

  function setOpen(modal, open) {
    if (!modal) return;
    if (open) {
      modal.setAttribute("aria-hidden", "false");
      modal.classList.remove("hidden");
      modal.classList.add("flex");
      document.body.classList.add("modal-open");
      setTimeout(() => modal.classList.add("opacity-100"), 10);
    } else {
      modal.setAttribute("aria-hidden", "true");
      modal.classList.remove("opacity-100");
      setTimeout(() => {
        modal.classList.remove("flex");
        modal.classList.add("hidden");
        const projectOpen =
          $("project-modal") &&
          !$("project-modal").classList.contains("hidden");
        const certOpen =
          $("cert-modal") && !$("cert-modal").classList.contains("hidden");
        if (!projectOpen && !certOpen) {
          document.body.classList.remove("modal-open");
        }
      }, 350);
    }
  }

  function updateSliderImage() {
    const img = $("modal-slider-img");
    const prev = img && img.parentElement.querySelector('[data-slide="prev"]');
    const next = img && img.parentElement.querySelector('[data-slide="next"]');
    if (!img) return;
    if (!currentProjectImages.length) {
      img.removeAttribute("src");
      img.alt = "";
      if (prev) prev.classList.add("hidden");
      if (next) next.classList.add("hidden");
      return;
    }
    img.src = currentProjectImages[currentImageIndex];
    const many = currentProjectImages.length > 1;
    if (prev) prev.classList.toggle("hidden", !many);
    if (next) next.classList.toggle("hidden", !many);
  }

  window.switchTab = function (tabName) {
    const tabs = ["projects", "certificates", "stack"];
    tabs.forEach((item) => {
      const button = $("tab-" + item);
      const content = $("content-" + item);
      if (!button || !content) return;

      if (item === tabName) {
        content.classList.remove("hidden");
        setTimeout(() => content.classList.add("opacity-100"), 10);
        content.classList.remove("opacity-0");
        button.classList.add("text-white", "border-blue-500");
        button.classList.remove(
          "text-gray-500",
          "hover:text-gray-300",
          "border-transparent",
        );
        content.querySelectorAll(".reveal-stagger").forEach((el) => {
          el.classList.remove("is-visible");
          void el.offsetWidth;
          requestAnimationFrame(() => el.classList.add("is-visible"));
        });
      } else {
        content.classList.add("hidden", "opacity-0");
        content.classList.remove("opacity-100");
        button.classList.remove("text-white", "border-blue-500");
        button.classList.add(
          "text-gray-500",
          "hover:text-gray-300",
          "border-transparent",
        );
      }
    });
  };

  window.toggleAllCertificates = function () {
    const wrap = $("cert-extra-wrap");
    const chevron = $("cert-toggle-chevron");
    const label = $("cert-toggle-label");
    if (!wrap) return;
    allCertsExpanded = !allCertsExpanded;

    if (allCertsExpanded) {
      wrap.classList.add("expanded");
      if (chevron) chevron.classList.add("rotated");
      if (label) {
        label.textContent =
          lang === "bs" ? "Sakrij certifikate" : "Hide Certificates";
      }
      const grid = $("cert-extra-grid");
      if (grid) {
        grid.querySelectorAll(".tilt-card").forEach((card, i) => {
          card.style.opacity = "0";
          card.style.transform = "translateY(24px)";
          card.style.transition =
            "opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)";
          setTimeout(
            () => {
              card.style.opacity = "1";
              card.style.transform = "translateY(0)";
            },
            150 + i * 90,
          );
        });
      }
    } else {
      wrap.classList.remove("expanded");
      if (chevron) chevron.classList.remove("rotated");
      if (label) {
        label.textContent =
          lang === "bs" ? "Prikaži sve certifikate" : "View All Certificates";
      }
    }
  };

  window.openModal = function (projectId) {
    const item = projectData[projectId];
    if (!item) return;

    $("modal-title").innerText = item.title;
    $("modal-tech").innerText = item.tech;
    $("modal-desc-text").innerText = item.desc;
    $("modal-dev-text").innerText = item.dev;

    const githubLink = $("modal-github-link");
    if (githubLink) {
      githubLink.href = item.repo || data.githubProfile;
      githubLink.target = "_blank";
      githubLink.rel = "noreferrer";
    }

    const demoLink = $("modal-demo-link");
    if (demoLink) {
      if (item.demo) {
        demoLink.href = item.demo;
        demoLink.classList.remove("hidden");
      } else {
        demoLink.removeAttribute("href");
        demoLink.classList.add("hidden");
      }
    }

    currentProjectImages = item.images || [];
    currentImageIndex = 0;
    updateSliderImage();
    window.switchModalTab("desc");
    setOpen($("project-modal"), true);
  };

  window.closeModal = function () {
    setOpen($("project-modal"), false);
  };

  window.openCertModal = function (certId) {
    const item = certData[certId];
    if (!item) return;

    $("cert-modal-title").innerText = item.title;
    $("cert-modal-category").innerText = item.category;
    $("cert-modal-date").innerText = item.date;
    $("cert-modal-issuer").innerText = item.issuer;
    $("cert-modal-desc").innerText = item.desc;

    const img = $("cert-modal-img");
    if (img) {
      if (item.image) {
        img.src = item.image;
        img.classList.remove("hidden");
      } else {
        img.removeAttribute("src");
        img.classList.add("hidden");
      }
    }

    const link = $("cert-modal-link");
    if (link) {
      if (item.link) {
        link.href = item.link;
        link.rel = "noopener noreferrer";
        link.classList.remove("hidden");
      } else {
        link.removeAttribute("href");
        link.classList.add("hidden");
      }
    }

    setOpen($("cert-modal"), true);
  };

  window.closeCertModal = function () {
    setOpen($("cert-modal"), false);
  };

  window.switchModalTab = function (tab) {
    const descTab = $("modal-tab-desc");
    const devTab = $("modal-tab-dev");
    const descContent = $("modal-content-desc");
    const devContent = $("modal-content-dev");
    if (!descTab || !devTab || !descContent || !devContent) return;

    const activate = (btn) => {
      btn.classList.add("text-white", "border-blue-500", "border-accentPurp");
      btn.classList.remove("text-gray-500", "border-transparent");
    };
    const deactivate = (btn) => {
      btn.classList.remove(
        "text-white",
        "border-blue-500",
        "border-accentPurp",
      );
      btn.classList.add("text-gray-500", "border-transparent");
    };

    if (tab === "desc") {
      descContent.classList.remove("hidden");
      devContent.classList.add("hidden");
      activate(descTab);
      deactivate(devTab);
    } else {
      descContent.classList.add("hidden");
      devContent.classList.remove("hidden");
      activate(devTab);
      deactivate(descTab);
    }
  };

  window.nextSlide = function () {
    if (!currentProjectImages.length) return;
    currentImageIndex = (currentImageIndex + 1) % currentProjectImages.length;
    updateSliderImage();
  };

  window.prevSlide = function () {
    if (!currentProjectImages.length) return;
    currentImageIndex =
      (currentImageIndex - 1 + currentProjectImages.length) %
      currentProjectImages.length;
    updateSliderImage();
  };

  window.scrollToSection = function (event, id) {
    const el = $(id);
    if (!el) return;
    if (event) event.preventDefault();
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    closeMobileMenu();
  };

  window.toggleMobileMenu = function () {
    const menu = $("mobile-menu");
    const btn = $("menu-toggle");
    if (!menu) return;
    const open = menu.classList.contains("hidden");
    menu.classList.toggle("hidden", !open);
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
  };

  function closeMobileMenu() {
    const menu = $("mobile-menu");
    const btn = $("menu-toggle");
    if (menu) menu.classList.add("hidden");
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  window.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    const projectModal = $("project-modal");
    const certModal = $("cert-modal");
    if (projectModal && !projectModal.classList.contains("hidden")) {
      window.closeModal();
    }
    if (certModal && !certModal.classList.contains("hidden")) {
      window.closeCertModal();
    }
    closeMobileMenu();
  });

  ["project-modal", "cert-modal"].forEach((id) => {
    const modal = $(id);
    if (!modal) return;
    modal.addEventListener("click", function (e) {
      if (e.target !== this) return;
      if (id === "project-modal") window.closeModal();
      else window.closeCertModal();
    });
  });

  const header = $("site-header");
  if (header) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 20) {
        header.classList.add("shadow-lg", "shadow-black/30");
      } else {
        header.classList.remove("shadow-lg", "shadow-black/30");
      }
    });
  }

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
  );
  document
    .querySelectorAll(".reveal, .reveal-stagger")
    .forEach((el) => revealObserver.observe(el));

  const countObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.count, 10);
        const suffix = el.dataset.suffix || "";
        const duration = 1200;
        const start = performance.now();

        function tick(now) {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(eased * target) + suffix;
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        countObserver.unobserve(el);
      });
    },
    { threshold: 0.5 },
  );
  document
    .querySelectorAll(".stat-number[data-count]")
    .forEach((el) => countObserver.observe(el));

  const filterBar = $("filter-bar");
  if (filterBar) {
    const projectCards = document.querySelectorAll(".project-card");
    const noResults = $("no-results");
    const initialFilter = filterBar.querySelector(".filter-chip.active");
    filterBar.querySelectorAll(".filter-chip").forEach((c) => {
      c.setAttribute("aria-pressed", c === initialFilter ? "true" : "false");
    });
    filterBar.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-chip");
      if (!btn) return;
      filterBar
        .querySelectorAll(".filter-chip")
        .forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      filterBar.querySelectorAll(".filter-chip").forEach((c) => {
        c.setAttribute("aria-pressed", c === btn ? "true" : "false");
      });
      const filter = btn.dataset.filter;
      let visibleCount = 0;
      projectCards.forEach((card) => {
        const tagsAttr = card.dataset.tags;
        const tags = tagsAttr ? tagsAttr.split(" ") : [];
        const match = filter === "all" || tags.includes(filter);
        card.classList.toggle("filtered-out", !match);
        if (match) visibleCount++;
      });
      if (noResults) noResults.classList.toggle("hidden", visibleCount !== 0);
    });
  }

  document.querySelectorAll(".project-card[data-project]").forEach((card) => {
    const title = card.querySelector("h3")?.textContent.trim() || "project";
    card.setAttribute("aria-label", `Open ${title} details`);
    const open = () => window.openModal(card.dataset.project);
    card.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      open();
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  });

  loadGithubActivity();

  [
    ["project-modal", "modal-title"],
    ["cert-modal", "cert-modal-title"],
  ].forEach(([modalId, titleId]) => {
    const modal = $(modalId);
    if (!modal) return;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", titleId);
    modal.setAttribute("aria-hidden", "true");
  });
})();
