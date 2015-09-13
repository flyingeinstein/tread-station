
$(function() {
	var commandPanel = {
		activated: false,
		expanded: false,
		indicator: $("#callout-indicator")
	}


	$(".command-panel")
		.css({ opacity: 0})
		.find("label").fadeOut(0);
	// catch mouse moves over the panel
	$(".command-panel").mousemove(function( event ) {
		var e = $(this);
		if(!commandPanel.activated && event.pageX<75) {
			var p = Math.max(0, (75-event.pageX)/75);
			e.css({ opacity: p});
			if(event.pageX<5) 
			{
				commandPanel.activated = true;
				e.find("label").fadeIn(400);
			}
		}
	});
	// catch when we leave the panel
	$(".command-panel").mouseleave(function( event ) {
		if(commandPanel.expanded) return false;
		var e = $(this)
			.css({opacity: 0})
			.find("label").fadeOut(0);
		commandPanel.activated = false;
	});
	
	// clicking on li's of class callout-link will expand to the correct panel callout
	$(".command-panel li[data-callout]").click(function( event ) {
		var menuItem = $(this);
		var panelId = menuItem.attr("data-callout");
		var panel=null;
		$(".callouts .callout").each(function(i, e) {
			if(this.id == panelId)
				(panel=$(this)).css({ display: "block" });
			else
				$(this).css({ display: "none" });
		});
		if(panel!=null) {
			var callouts = panel.parent();
			var cwidth = Number(panel.attr("data-width"));
			callouts.animate({ width:cwidth, left:-cwidth }); 
			panel.css({ width: cwidth-(callouts.innerWidth()-callouts.width())});
			// animate the html body to the right
			var body = $("body")
				.css({ position: "absolute" })
				.animate({ left: cwidth+"px" });
			// hide the title area
			$("#header-title").animate({ opacity: 0 });
			// show the indicator
			commandPanel.indicator
				.css({ display: "inline-block" })
				.animate({ top: (menuItem.offset().top)+"px", opacity: 1 });
			$(".command-panel")
				.animate({ opacity: 1});
			commandPanel.expanded = true;
		}
		event.stopPropagation();
	});
	$("body").click(function( event ) {
		if(commandPanel.expanded && event.pageX>300) {
			$(this)
				.animate({ left: "0px" });
			$("#header-title").animate({ opacity: 1 });
			$(".command-panel")
				.animate({ opacity: 0})
				.find("label").fadeOut(0);
			commandPanel.indicator
				.css({ top:"-50px", opacity: 0 })
			commandPanel.expanded = commandPanel.activated = false;
		}
	});
});