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

$(document).ready(function () {
    $('button.action-btn').on('click', function() {
        var answerItem = $(this).closest('.questions-answer').find('.answer-item')
        answerItem.toggleClass('answer-active')
        console.log($(this).data('hide'))
        if($(this).data('hide')) {
            $(this).find('svg g path').remove()
            $(this).find('svg g').html('<path d="M8 16H24M8 16L24 16" stroke="white" stroke-width="2" />')
        } else {
            $(this).find('svg g path').remove()
            $(this).find('svg g').html('<path d="M23.2381 15.2381H16.7619V8.76191C16.7619 8.34134 16.4213 8 16 8C15.5787 8 15.2381 8.34134 15.2381 8.76191V15.2381H8.76191C8.34056 15.2381 8 15.5794 8 16C8 16.4206 8.34056 16.7619 8.76191 16.7619H15.2381V23.2381C15.2381 23.6587 15.5787 24 16 24C16.4213 24 16.7619 23.6587 16.7619 23.2381V16.7619H23.2381C23.6594 16.7619 24 16.4206 24 16C24 15.5794 23.6594 15.2381 23.2381 15.2381Z" fill="white"/>')
        }
        $(this).data('hide', !$(this).data('hide'))
    } )
})