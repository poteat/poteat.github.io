function showSimMenu()
{
	var menu = document.getElementById("sim_menu");
	if (!menu.classList.contains('show'))
	{
		menu.classList.toggle("show");
	}
}

function showBioMenu()
{
	var menu = document.getElementById("bio_menu");
	if (!menu.classList.contains('show'))
	{
		menu.classList.toggle("show");
	}
}

function showRoboMenu()
{
	var menu = document.getElementById("robo_menu");
	if (!menu.classList.contains('show'))
	{
		menu.classList.toggle("show");
	}
}

window.onmouseover = function(e)
{
	if (e.target.parentNode == null)
	{
		return;
	}

	keep_sim_menu = (e.target.id == "sim_button") || (e.target.parentNode.id ==
		"sim_menu");
	keep_bio_menu = (e.target.id == "bio_button") || (e.target.parentNode.id ==
		"bio_menu");
	keep_robo_menu = (e.target.id == "robo_button") || (e.target.parentNode.id ==
		"robo_menu");

	var menu = document.getElementById("sim_menu");
	if (keep_sim_menu && menu.classList.contains('show'))
	{
		// Remove all other menus

		var menu = document.getElementById("bio_menu");
		if (menu != null)
		{
			if (menu.classList.contains('show'))
			{
				menu.classList.remove('show');
			}
		}

		var menu = document.getElementById("robo_menu");
		if (menu != null)
			if (menu.classList.contains('show'))
			{
				menu.classList.remove('show');
			}
	}
	else
	{
		var menu = document.getElementById("sim_menu");
		if (menu != null)
			if (menu.classList.contains('show'))
			{
				menu.classList.remove('show');
			}
	}

	var menu = document.getElementById("bio_menu");
	if (keep_bio_menu && menu.classList.contains('show'))
	{
		// Remove all other menus

		var menu = document.getElementById("sim_menu");
		if (menu != null)
			if (menu.classList.contains('show'))
			{
				menu.classList.remove('show');
			}

		var menu = document.getElementById("robo_menu");
		if (menu != null)
			if (menu.classList.contains('show'))
			{
				menu.classList.remove('show');
			}
	}
	else
	{
		var menu = document.getElementById("bio_menu");
		if (menu != null)
			if (menu.classList.contains('show'))
			{
				menu.classList.remove('show');
			}
	}

	var menu = document.getElementById("robo_menu");
	if (keep_robo_menu && menu.classList.contains('show'))
	{
		// Remove all other menus

		var menu = document.getElementById("sim_menu");
		if (menu != null)
			if (menu.classList.contains('show'))
			{
				menu.classList.remove('show');
			}

		var menu = document.getElementById("bio_menu");
		if (menu != null)
			if (menu.classList.contains('show'))
			{
				menu.classList.remove('show');
			}
	}
	else
	{
		var menu = document.getElementById("robo_menu");
		if (menu != null)
			if (menu.classList.contains('show'))
			{
				menu.classList.remove('show');
			}
	}
}
