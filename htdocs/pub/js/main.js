$('.toggle-menu i').on('click', function () {
    $('.tab-sidebar').toggleClass('menu-active')
    $('.content').toggleClass('opacity')
})
$(document).mouseup(function (e) {
    var tabSidebar = $('.tab-sidebar');
   
    if (!tabSidebar.is(e.target) && tabSidebar.hasClass('menu-active') && tabSidebar.has(e.target).length === 0) {
        tabSidebar.removeClass('menu-active');
        $('.toggle-menu').removeClass('active-toggle')
        $('.content').removeClass('opacity')
    }
});