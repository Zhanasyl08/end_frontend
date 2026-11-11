/* Aura Shop - Endterm project
 * JavaScript + jQuery features:
 *   1. Form validation (register.html, contact.html)
 *   2. Live search + category filter (products.html)
 *   3. Dynamic table with CRUD (compare.html)
 *   4. Image gallery with lightbox (about.html)
 * Every block runs only on the page where its elements exist.
 */
$(function () {
  'use strict';

  /* ------------------------------------------------------------------
   * Helpers
   * ------------------------------------------------------------------ */
  var EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function setState($field, isValid) {
    $field.toggleClass('is-valid', isValid).toggleClass('is-invalid', !isValid);
    return isValid;
  }

  function showAlert($box, type, message) {
    $box.html(
      '<div class="alert alert-' + type + ' alert-dismissible fade show" role="alert">' +
      escapeHtml(message) +
      '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
      '</div>'
    );
  }

  /* ------------------------------------------------------------------
   * 1. FORM VALIDATION
   * ------------------------------------------------------------------ */

  /* ----- Registration form ----- */
  function initRegisterForm() {
    var $form = $('#registerForm');
    if (!$form.length) { return; }

    var $name = $('#regName');
    var $email = $('#regEmail');
    var $pass = $('#regPassword');
    var $confirm = $('#regConfirm');
    var $bar = $('#strengthBar');
    var $strengthText = $('#strengthText');

    function checkName() {
      return setState($name, $.trim($name.val()).length >= 2);
    }

    function checkEmail() {
      return setState($email, EMAIL_REGEX.test($.trim($email.val())));
    }

    /* score from 0 to 5 -> weak / medium / strong */
    function passwordScore(value) {
      var score = 0;
      if (value.length >= 8) { score++; }
      if (value.length >= 12) { score++; }
      if (/[a-z]/.test(value) && /[A-Z]/.test(value)) { score++; }
      if (/\d/.test(value)) { score++; }
      if (/[^A-Za-z0-9]/.test(value)) { score++; }
      return score;
    }

    function updateStrength() {
      var value = $pass.val();
      if (!value) {
        $bar.css('width', '0%').removeClass('bg-danger bg-warning bg-success');
        $strengthText.text('Password strength: -').removeClass('strength-weak strength-medium strength-strong');
        return;
      }
      var score = passwordScore(value);
      var level, width, barClass, textClass;
      if (value.length < 8 || score <= 2) {
        level = 'Weak'; width = '33%'; barClass = 'bg-danger'; textClass = 'strength-weak';
      } else if (score === 3) {
        level = 'Medium'; width = '66%'; barClass = 'bg-warning'; textClass = 'strength-medium';
      } else {
        level = 'Strong'; width = '100%'; barClass = 'bg-success'; textClass = 'strength-strong';
      }
      $bar.removeClass('bg-danger bg-warning bg-success').addClass(barClass)
        .css('width', width).attr('aria-valuenow', parseInt(width, 10));
      $strengthText.removeClass('strength-weak strength-medium strength-strong')
        .addClass(textClass).text('Password strength: ' + level);
    }

    function checkPassword() {
      return setState($pass, $pass.val().length >= 8);
    }

    function checkConfirm() {
      var confirmValue = $confirm.val();
      if (!confirmValue) {
        $('#confirmFeedback').text('Please confirm your password.');
        return setState($confirm, false);
      }
      var match = confirmValue === $pass.val();
      $('#confirmFeedback').text('Passwords do not match.');
      return setState($confirm, match && $pass.val().length > 0);
    }

    /* real-time feedback */
    $name.on('input blur', checkName);
    $email.on('input blur', checkEmail);
    $pass.on('input', function () {
      updateStrength();
      checkPassword();
      if ($confirm.val()) { checkConfirm(); }
    });
    $pass.on('blur', checkPassword);
    $confirm.on('input blur', checkConfirm);

    $('#togglePassword').on('click', function () {
      var hidden = $pass.attr('type') === 'password';
      $pass.attr('type', hidden ? 'text' : 'password');
      $confirm.attr('type', hidden ? 'text' : 'password');
      $(this).text(hidden ? 'Hide' : 'Show');
    });

    $form.on('submit', function (event) {
      event.preventDefault();
      /* run every check so all errors are shown at once */
      var results = [checkName(), checkEmail(), checkPassword(), checkConfirm()];
      var ok = results.every(Boolean);
      var $alertBox = $('#registerAlert');

      if (!ok) {
        showAlert($alertBox, 'danger', 'Please fix the errors below and try again.');
        $form.find('.is-invalid').first().trigger('focus');
        return;
      }
      showAlert($alertBox, 'success', 'Registration successful! Welcome to Aura Shop, ' + $.trim($name.val()) + '.');
      $form[0].reset();
      $form.find('.is-valid, .is-invalid').removeClass('is-valid is-invalid');
      updateStrength();
    });
  }

  /* ----- Contact form (name, email, message) ----- */
  function initContactForm() {
    var $form = $('#contactForm');
    if (!$form.length) { return; }

    var $name = $('#name');
    var $email = $('#email');
    var $message = $('#message');

    function checkName() { return setState($name, $.trim($name.val()).length >= 2); }
    function checkEmail() { return setState($email, EMAIL_REGEX.test($.trim($email.val()))); }
    function checkMessage() { return setState($message, $.trim($message.val()).length >= 10); }

    $name.on('input blur', checkName);
    $email.on('input blur', checkEmail);
    $message.on('input blur', checkMessage);

    $form.before('<div id="contactAlert"></div>');

    $form.on('submit', function (event) {
      event.preventDefault();
      var ok = [checkName(), checkEmail(), checkMessage()].every(Boolean);
      var $alertBox = $('#contactAlert');
      if (!ok) {
        showAlert($alertBox, 'danger', 'Please fix the errors below before sending.');
        $form.find('.is-invalid').first().trigger('focus');
        return;
      }
      showAlert($alertBox, 'success', 'Thank you! Your message was sent. We will answer by email.');
      $form[0].reset();
      $form.find('.is-valid, .is-invalid').removeClass('is-valid is-invalid');
    });
  }

  /* ------------------------------------------------------------------
   * 2. DYNAMIC SEARCH + CATEGORY FILTER (products.html)
   * ------------------------------------------------------------------ */
  function initProductFilter() {
    var $search = $('#productSearch');
    if (!$search.length) { return; }

    var $items = $('.product-item');
    var $buttons = $('#categoryFilters button');
    var activeCategory = 'all';

    function applyFilter() {
      var query = $.trim($search.val()).toLowerCase();
      var visibleCount = 0;

      $items.each(function () {
        var $item = $(this);
        var text = $item.text().toLowerCase();
        var category = String($item.data('category')).toLowerCase();
        var matchText = query === '' || text.indexOf(query) !== -1;
        var matchCategory = activeCategory === 'all' || category === activeCategory;
        var show = matchText && matchCategory;

        if (show) {
          visibleCount++;
          if ($item.is(':hidden')) { $item.stop(true, true).fadeIn(200); }
        } else {
          $item.stop(true, true).hide();
        }
      });

      /* hide whole category blocks (title + row) when nothing is visible in them */
      $('.product-row').each(function () {
        var $row = $(this);
        var hasVisible = $row.find('.product-item').filter(function () {
          var $it = $(this);
          var t = $it.text().toLowerCase();
          var c = String($it.data('category')).toLowerCase();
          return (query === '' || t.indexOf(query) !== -1) &&
                 (activeCategory === 'all' || c === activeCategory);
        }).length > 0;
        $row.toggle(hasVisible);
        $('.product-section-title[data-category="' + $row.data('category') + '"]').toggle(hasVisible);
      });

      $('#noResults').toggle(visibleCount === 0);
      $('#resultsCount').text('Showing ' + visibleCount + ' of ' + $items.length + ' products');
    }

    $search.on('input keyup', applyFilter);

    $buttons.on('click', function () {
      activeCategory = String($(this).data('category')).toLowerCase();
      $buttons.removeClass('active');
      $(this).addClass('active');
      applyFilter();
    });

    applyFilter();
  }

  /* ------------------------------------------------------------------
   * 3. DYNAMIC TABLE WITH CRUD (compare.html)
   * ------------------------------------------------------------------ */
  function initProductTable() {
    var $tbody = $('#productsTableBody');
    if (!$tbody.length) { return; }

    var STORAGE_KEY = 'auraShopProducts';
    var defaults = [
      { id: 1, name: 'White T-shirt', category: 'Clothes', price: 4500, stock: 'Yes', rating: 4.5 },
      { id: 2, name: 'Blue jeans', category: 'Clothes', price: 12900, stock: 'Yes', rating: 4.2 },
      { id: 3, name: 'Gray hoodie', category: 'Clothes', price: 9800, stock: 'No', rating: 4.0 },
      { id: 4, name: 'Black headphones', category: 'Gadgets', price: 18900, stock: 'Yes', rating: 4.7 },
      { id: 5, name: 'Smart watch', category: 'Gadgets', price: 24900, stock: 'Yes', rating: 4.4 },
      { id: 6, name: 'Power bank', category: 'Gadgets', price: 7900, stock: 'Yes', rating: 4.1 },
      { id: 7, name: 'Red lipstick', category: 'Cosmetics', price: 3200, stock: 'Yes', rating: 4.3 },
      { id: 8, name: 'Face cream', category: 'Cosmetics', price: 5100, stock: 'Yes', rating: 4.6 },
      { id: 9, name: 'Light perfume', category: 'Cosmetics', price: 8700, stock: 'No', rating: 4.0 }
    ];

    function load() {
      try {
        var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if ($.isArray(saved)) { return saved; }
      } catch (e) { /* ignore and use defaults */ }
      return defaults.slice();
    }

    function save() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(products)); } catch (e) { /* storage unavailable */ }
    }

    var products = load();
    var pendingDeleteId = null;
    var productModal = new bootstrap.Modal(document.getElementById('productModal'));
    var deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));

    function nextId() {
      return products.reduce(function (max, p) { return Math.max(max, p.id); }, 0) + 1;
    }

    /* READ */
    function render(highlightId) {
      var html = '';
      $.each(products, function (_, p) {
        html +=
          '<tr data-id="' + p.id + '">' +
          '<td>' + escapeHtml(p.name) + '</td>' +
          '<td>' + escapeHtml(p.category) + '</td>' +
          '<td>' + Number(p.price) + ' KZT</td>' +
          '<td>' + escapeHtml(p.stock) + '</td>' +
          '<td>' + Number(p.rating).toFixed(1) + '</td>' +
          '<td>' +
          '<button type="button" class="btn btn-sm btn-outline-success btn-edit">Edit</button>' +
          '<button type="button" class="btn btn-sm btn-outline-danger btn-delete">Delete</button>' +
          '</td>' +
          '</tr>';
      });
      $tbody.html(html);
      $('#tableEmpty').toggle(products.length === 0);

      if (highlightId) {
        $tbody.find('tr[data-id="' + highlightId + '"]').hide().fadeIn(500);
      }
    }

    function findById(id) {
      for (var i = 0; i < products.length; i++) {
        if (products[i].id === id) { return products[i]; }
      }
      return null;
    }

    /* modal form helpers */
    var $form = $('#productForm');
    var $pName = $('#pName');
    var $pPrice = $('#pPrice');
    var $pRating = $('#pRating');

    function validateProductForm() {
      var nameOk = setState($pName, $.trim($pName.val()).length > 0);
      var price = parseFloat($pPrice.val());
      var priceOk = setState($pPrice, !isNaN(price) && price > 0);
      var rating = parseFloat($pRating.val());
      var ratingOk = setState($pRating, !isNaN(rating) && rating >= 0 && rating <= 5);
      return nameOk && priceOk && ratingOk;
    }

    function resetProductForm() {
      $form[0].reset();
      $form.find('.is-valid, .is-invalid').removeClass('is-valid is-invalid');
      $('#productId').val('');
    }

    $pName.add($pPrice).add($pRating).on('input', validateProductForm);

    /* CREATE (open empty modal) */
    $('#addProductBtn').on('click', function () {
      resetProductForm();
      $('#productModalTitle').text('Add product');
      productModal.show();
    });

    /* UPDATE (open modal filled with row data) */
    $tbody.on('click', '.btn-edit', function () {
      var id = Number($(this).closest('tr').data('id'));
      var p = findById(id);
      if (!p) { return; }
      resetProductForm();
      $('#productModalTitle').text('Edit product');
      $('#productId').val(p.id);
      $pName.val(p.name);
      $('#pCategory').val(p.category);
      $pPrice.val(p.price);
      $('#pStock').val(p.stock);
      $pRating.val(p.rating);
      productModal.show();
    });

    /* CREATE / UPDATE (save) */
    $form.on('submit', function (event) {
      event.preventDefault();
      if (!validateProductForm()) { return; }

      var data = {
        name: $.trim($pName.val()),
        category: $('#pCategory').val(),
        price: Math.round(parseFloat($pPrice.val())),
        stock: $('#pStock').val(),
        rating: Math.round(parseFloat($pRating.val()) * 10) / 10
      };
      var editId = $('#productId').val();
      var highlightId;

      if (editId) {
        var p = findById(Number(editId));
        if (p) { $.extend(p, data); highlightId = p.id; }
      } else {
        data.id = nextId();
        products.push(data);
        highlightId = data.id;
      }
      save();
      render(highlightId);
      productModal.hide();
    });

    /* DELETE (with confirmation) */
    $tbody.on('click', '.btn-delete', function () {
      var id = Number($(this).closest('tr').data('id'));
      var p = findById(id);
      if (!p) { return; }
      pendingDeleteId = id;
      $('#deleteName').text(p.name);
      deleteModal.show();
    });

    $('#confirmDelete').on('click', function () {
      if (pendingDeleteId === null) { return; }
      var id = pendingDeleteId;
      pendingDeleteId = null;
      deleteModal.hide();
      var $row = $tbody.find('tr[data-id="' + id + '"]');
      $row.fadeOut(300, function () {
        products = $.grep(products, function (p) { return p.id !== id; });
        save();
        render();
      });
    });

    render();
  }

  /* ------------------------------------------------------------------
   * 4. IMAGE GALLERY + LIGHTBOX (about.html)
   * ------------------------------------------------------------------ */
  function initGallery() {
    var $gallery = $('#gallery');
    if (!$gallery.length) { return; }

    var $images = $gallery.find('.gallery-img');
    var $lightbox = $('#lightbox');
    var $lbImage = $('#lbImage');
    var $caption = $('#lbCaption');
    var current = 0;
    var busy = false;
    var isOpen = false;

    function fullSrc(src) {
      /* larger version of the same Unsplash picture for the lightbox */
      return src.replace(/w=\d+/, 'w=1400');
    }

    function setImage(index) {
      var $img = $images.eq(index);
      $lbImage.attr('src', fullSrc($img.attr('src'))).attr('alt', $img.attr('alt'));
      $caption.text($img.attr('alt') + '  (' + (index + 1) + ' / ' + $images.length + ')');
    }

    function open(index) {
      current = index;
      isOpen = true;
      busy = false;
      setImage(current);
      $lightbox.stop(true, true).fadeIn(300);
      $('body').css('overflow', 'hidden');
      $('#lbClose').trigger('focus');
    }

    function close() {
      isOpen = false;
      $lightbox.stop(true, true).fadeOut(250);
      $('body').css('overflow', '');
      $images.eq(current).trigger('focus');
    }

    function go(step) {
      if (busy) { return; }
      busy = true;
      current = (current + step + $images.length) % $images.length;
      $lbImage.stop(true, true).fadeOut(200, function () {
        setImage(current);
        $lbImage.fadeIn(300, function () { busy = false; });
      });
    }

    $images.on('click', function () { open($images.index(this)); });
    $images.on('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open($images.index(this));
      }
    });

    $('#lbClose').on('click', close);
    $('#lbPrev').on('click', function () { go(-1); });
    $('#lbNext').on('click', function () { go(1); });

    /* click on dark background closes the viewer */
    $lightbox.on('click', function (event) {
      if (event.target === this) { close(); }
    });

    $(document).on('keydown', function (event) {
      if (!isOpen) { return; }
      if (event.key === 'Escape') { close(); }
      else if (event.key === 'ArrowLeft') { go(-1); }
      else if (event.key === 'ArrowRight') { go(1); }
    });
  }

  /* ------------------------------------------------------------------
   * Start
   * ------------------------------------------------------------------ */
  initRegisterForm();
  initContactForm();
  initProductFilter();
  initProductTable();
  initGallery();
});
