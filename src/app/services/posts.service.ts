import { Injectable, SecurityContext } from '@angular/core';
import { ProcessedPost } from '../interfaces/processed-post';
import { RawPost } from '../interfaces/raw-post';
import { MediaService } from './media.service';
import  {sanitize} from 'dompurify';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { BehaviorSubject } from 'rxjs';
import { JwtService } from './jwt.service';
@Injectable({
  providedIn: 'root'
})
export class PostsService {

  parser = new DOMParser();
  wafrnMediaRegex = /\[wafrnmediaid="[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}"\]/gm;
  wafrnMentionRegex = /\[mentionuserid="[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}"\]/gm;
  uuidRegex = /[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}/;
  youtubeRegex = /((?:https?:\/\/)?(www.|m.)?(youtube(\-nocookie)?\.com|youtu\.be)\/(v\/|watch\?v=|embed\/)?([\S]{11}))([^\S]|\?[\S]*|\&[\S]*|\b)/g;
  public updateFollowers: BehaviorSubject<Boolean> = new BehaviorSubject(new Boolean());

  public followedUserIds: Array<String> = [];
  public blockedUserIds: Array<string> = [];
  constructor(
    private mediaService: MediaService,
    private http: HttpClient,
    private jwtService: JwtService
  ) {
    this.loadFollowers();
  }


  async loadFollowers() {
    if(this.jwtService.tokenValid()) {
      let followsAndBlocks = await this.http.get<{
        followedUsers: string[],
        blockedUsers: string[]
      }>(`${environment.baseUrl}/getFollowedUsers`).toPromise()
      if (followsAndBlocks) {
        this.followedUserIds = followsAndBlocks.followedUsers;
        this.blockedUserIds = followsAndBlocks.blockedUsers;
        this.updateFollowers.next(true);
      }
    }
  }

  async followUser(id: string): Promise<boolean> {
    let res = false;
    let payload = {
      userId: id
    }
    try {
      let response = await this.http.post<{ success: boolean }>(`${environment.baseUrl}/follow`, payload).toPromise();
      await this.loadFollowers();
      res = response?.success === true;
    } catch (exception) {
      console.log(exception)
    }

    return res;
  }

  async unfollowUser(id: string): Promise<boolean> {
    let res = false;
    let payload = {
      userId: id
    }
    try {
      let response = await this.http.post<{ success: boolean }>(`${environment.baseUrl}/unfollow`, payload).toPromise();
      await this.loadFollowers();
      res = response?.success === true;
    } catch (exception) {
      console.log(exception)
    }

    return res;
  }

  async likePost(id: string): Promise<boolean> {
    let res = false;
    let payload = {
      postId: id
    }
    try {
      let response = await this.http.post<{ success: boolean }>(`${environment.baseUrl}/like`, payload).toPromise();
      await this.loadFollowers();
      res = response?.success === true;
    } catch (exception) {
      console.log(exception)
    }

    return res;
  }

  async unlikePost(id: string): Promise<boolean> {
    let res = false;
    let payload = {
      postId: id
    }
    try {
      let response = await this.http.post<{ success: boolean }>(`${environment.baseUrl}/unlike`, payload).toPromise();
      await this.loadFollowers();
      res = response?.success === true;
    } catch (exception) {
      console.log(exception)
    }

    return res;
  }

  processPost(rawPost: RawPost): ProcessedPost[] {
    let result: ProcessedPost[] = [];
    const notes = rawPost.notes;
    if (rawPost.ancestors) {
      rawPost.ancestors.forEach((post: RawPost) => {
        result.push({...post, tags: post.postTags, remotePostId: post.remotePostId? post.remotePostId : `${environment.frontUrl}/post/${post.id}` ,userLikesPostRelations: post.userLikesPostRelations.map(elem => elem.userId) , notes: notes, descendents: []});
      });
      result = result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      result.push({...rawPost, tags: rawPost.postTags, userLikesPostRelations: rawPost.userLikesPostRelations.map(elem => elem.userId), remotePostId: rawPost.remotePostId? rawPost.remotePostId : `${environment.frontUrl}/post/${rawPost.id}`, notes: notes, descendents: []});
    }
    if (rawPost.descendents) {
      result[result.length - 1 ].descendents = rawPost.descendents.map(elem => {
        elem.user.avatar = elem.user.url.startsWith('@') ? environment.externalCacheurl + encodeURI(elem.user.avatar) : environment.baseMediaUrl + elem.user.avatar;
        return elem;
      }).sort((a: RawPost, b: RawPost) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
    result = result.filter((elem, index) => elem.content != '' || index === result.length -1 )
    result.forEach((val, index) => {
      this.mediaService.addMediaToMap(val);
    });
    return result.map(elem => {
      elem.user.emojis?.forEach(emoji => {
        elem.user.name = elem.user.name.replaceAll(emoji.name, `<img class="post-emoji" src="${environment.externalCacheurl + encodeURIComponent(emoji.url)}">`)
      })
      return elem
    });
  }


  getPostHtml(post: ProcessedPost): string {
    const content = post.content;
    const replacementsWafrnMedia: Array<{ wafrnMediaStringToReplace: string, id: string }> = [];
    const replacementsWafrnMentions: Array<{ wafrnMentionstringToReplace: string, url: string }> = [];

    let sanitized = sanitize(content, {
      ALLOWED_TAGS: ['b', 'i', 'u', 'a','s', 'span', 'br', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'strong', 'em', 'ul', 'li', 'marquee', 'font'],
      ALLOWED_ATTR: ['style', 'class', 'href', 'color']
    });
    // we remove stuff like img and script tags. we only allow certain stuff.
    const parsedAsHTML = this.parser.parseFromString(sanitized, 'text/html')
    const links = parsedAsHTML.getElementsByTagName('a')
    const mentionedRemoteIds = post.mentionPost ?  post.mentionPost?.map(elem => elem.remoteId) : [];
    const mentionRemoteUrls = post.mentionPost ?  post.mentionPost?.map(elem => elem.url) : [];
    const mentionedHosts = post.mentionPost ?  post.mentionPost?.map(elem => new URL(elem.remoteId? elem.remoteId : 'https://adomainthatdoesnotexist.google.com').hostname) : [];
    Array.from(links).forEach((link) => {
      const youtubeMatch = link.href.matchAll(this.youtubeRegex)
      if(link.innerText === link.href && youtubeMatch) {
          Array.from(youtubeMatch).forEach(youtubeString => {
            const ytPlayer = document.createElement("app-wafrn-youtube-player")
            ytPlayer.setAttribute('video',youtubeString[6] )
            link.innerHTML =  `<app-wafrn-youtube-player video="${youtubeString[6]}" > </app-wafrn-youtube-player>`
          })
      }
      // replace mentioned users with wafrn version of profile.
      // TODO not all software links to mentionedProfile
      if(mentionedRemoteIds.includes(link.href)) {
        if (post.mentionPost) {
          let mentionedUser = post.mentionPost.find(elem => elem.remoteId === link.href);
          if(mentionedUser) {
            link.href = `${environment.frontUrl}/blog/${mentionedUser.url}`
          }
        }

      }
      const linkAsUrl = new URL(link.href)
      if(mentionedHosts.includes(linkAsUrl.hostname)){
        const sanitizedContent = sanitize(link.innerHTML, {
          ALLOWED_TAGS: []
        })
        if(sanitizedContent.startsWith('@') && mentionRemoteUrls.includes(`${sanitizedContent}@${linkAsUrl.hostname}`)) {
          link.href = `/blog/${sanitizedContent}@${linkAsUrl.hostname}`
        }
        if(sanitizedContent.startsWith('@') && mentionRemoteUrls.includes(`${sanitizedContent}`)) {
          link.href = `/blog/${sanitizedContent}`
        }
      }
      link.target = "_blank"
      sanitized = parsedAsHTML.documentElement.innerHTML
    });


    sanitized.match(this.wafrnMediaRegex)?.forEach((media) => {
      let id = '0';
      const uuid = media.match(this.uuidRegex);
      if (uuid) {
        id = uuid[0]
      }
      replacementsWafrnMedia.push({ wafrnMediaStringToReplace: media, id: id });
    });

    sanitized.match(this.wafrnMentionRegex)?.forEach((mention) => {
      let id = '0';
      const uuid = mention.match(this.uuidRegex);
      if (uuid) {
        id = uuid[0]
      }
      replacementsWafrnMentions.push({ wafrnMentionstringToReplace: mention, url: this.mediaService.mentionsMap[id]?.url });
    });
    replacementsWafrnMedia.forEach(replacement => {
      const replacementString = `<app-wafrn-media id="${replacement.id}" > </app-wafrn-media>`
      sanitized = sanitized.replace(replacement.wafrnMediaStringToReplace, replacementString);
    });

    replacementsWafrnMentions.forEach(replacement => {
      if(!replacement.url) {
        replacement.url = ''
      }
      const replacementString = `<a href="/blog/${sanitize(replacement.url)}" >@${sanitize(replacement.url.startsWith('@') ? replacement.url.substring(1): replacement.url)}</a>`
      sanitized = sanitized.replace(replacement.wafrnMentionstringToReplace, replacement.url ? replacementString: '_error_in_mention_');
    });

    post.emojis.forEach(emoji => {
      if(emoji.name.startsWith(':') && emoji.name.endsWith(':')) {
        sanitized = sanitized.replaceAll(emoji.name,
          `<img src="${environment.externalCacheurl + encodeURIComponent(emoji.url)}" class="post-emoji"/>`
          )
      }
    })


    return sanitized;

  }

  postContainsBlocked(processedPost: ProcessedPost[]): boolean {
    let res = false;
    processedPost.forEach(fragment => {
      if (
        this.blockedUserIds.indexOf(fragment.userId) !== -1
      ) {
        res = true;
      }
    })
    return res;
  }

  getPostContentSanitized(content: string): string {
    return sanitize(content);
  }

  async loadRepliesFromFediverse(id: string) {
    return await this.http.get(`${environment.baseUrl}/loadRemoteResponses?id=${id}`).toPromise()
  }
}
