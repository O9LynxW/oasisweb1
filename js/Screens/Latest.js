import { Create, BuildPage, BuildEmpty, OpenExternal } from "../Dom.js"
import { FormatDate } from "../Format.js"

function BuildPost(Post) {
	const Card = Post.Link ? OpenExternal(Create("a", "Post"), Post.Link) : Create("article", "Post")
	Card.appendChild(Create("time", "PostDate", FormatDate(Post.Date)))
	const Copy = Create("div", "PostText")
	Copy.appendChild(Create("h3", null, Post.Title))
	Copy.appendChild(Create("p", null, Post.Text))
	Card.appendChild(Copy)
	return Card
}

export const Name = "Latest"

export function Mount(Root, Context) {
	const Body = BuildPage(Root, "Latest", "NEW WORK AND NEWS")
	if (Context.Posts.length === 0) {
		Body.appendChild(BuildEmpty("nothing posted yet"))
		return
	}

	const List = Create("div", "Posts")
	Context.Posts.forEach(function (Post) { List.appendChild(BuildPost(Post)) })
	Body.appendChild(List)
}
