document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('.scroll-reveal');
  const navLinks = document.querySelectorAll('.nav-link');
  const progressBar = document.getElementById('progress-bar');

  const revealOnScroll = () => {
    const triggerBottom = (window.innerHeight / 5) * 4;

    sections.forEach((section) => {
      const sectionTop = section.getBoundingClientRect().top;

      if (sectionTop < triggerBottom) {
        section.add('active');
      }
    });
  };

  const updateActiveNavAndProgress = () => {
    const scrollTotal = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = (window.scrollY / scrollTotal) * 100;
    progressBar.style.width = `${scrollPercent}%`;

    let currentSectionId = '';
    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;

      if (window.scrollY >= sectionTop - 150) {
        currentSectionId = section.getAttribute('id');
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentSectionId}`) {
        link.classList.add('active');
      }
    });
  };

  window.addEventListener('scroll', revealOnScroll);
  window.addEventListener('scroll', updateActiveNavAndProgress);

  revealOnScroll();
  updateActiveNavAndProgress();
});
