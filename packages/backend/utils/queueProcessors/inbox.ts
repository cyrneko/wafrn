import { Job } from 'bullmq'
import { logger } from '../logger'
import { Blocks, Emoji, EmojiReaction, FederatedHost, Follows, Post, User, UserLikesPostRelations } from '../../db'
import { getRemoteActor } from '../activitypub/getRemoteActor'
import { signAndAccept } from '../activitypub/signAndAccept'
import { removeUser } from '../activitypub/removeUser'
import { getPostThreadRecursive } from '../activitypub/getPostThreadRecursive'
import getBlockedIds from '../cacheGetters/getBlockedIds'
import getUserBlockedServers from '../cacheGetters/getUserBlockedServers'
import { deletePostCommon } from '../deletePost'
import { AcceptActivity } from '../activitypub/processors/accept'
import { AnnounceActivity } from '../activitypub/processors/announce'
import { CreateActivity } from '../activitypub/processors/create'
import { FollowActivity } from '../activitypub/processors/follow'
import { UpdateActivity } from '../activitypub/processors/update'
import { UndoActivity } from '../activitypub/processors/undo'
import { LikeActivity } from '../activitypub/processors/like'
import { DeleteActivity } from '../activitypub/processors/delete'
import { EmojiReactActivity } from '../activitypub/processors/emojiReact'
import { RemoveActivity } from '../activitypub/processors/remove'
import { AddActivity } from '../activitypub/processors/add'
import { BlockActivity } from '../activitypub/processors/block'
import { MoveActivity } from '../activitypub/processors/move'

async function inboxWorker(job: Job) {
  try {
    const user = await User.findByPk(job.data.petitionBy)
    const body = job.data.petition
    const req = { body: body }
    // little hack that should be fixed later
    if (req.body.type === 'Delete' && req.body.id.endsWith('#delete')) {
      const userToRemove = await User.findOne({
        where: {
          remoteId: req.body.id.split('#')[0].toLowerCase()
        }
      })
      if (userToRemove) {
        await removeUser(userToRemove.id)
        return
      }
    }
    const remoteUser = await getRemoteActor(req.body.actor, user)
    const host = await FederatedHost.findOne({
      where: {
        displayName: new URL(req.body.actor).host
      }
    })
    // we check if the user has blocked the user or the server. This will mostly work for follows and dms. Will investigate further down the line
    const userBlocks: string[] = await getBlockedIds(user.id, false)
    const blocksExisting = userBlocks.includes(remoteUser.id) ? 1 : 0
    const blockedServersData = await getUserBlockedServers(user.id)
    const blocksServers = blockedServersData.find((elem: any) => elem.id === host.id) ? 1 : 0
    if (!remoteUser?.banned && !host?.blocked && blocksExisting + blocksServers === 0) {
      switch (req.body.type) {
        case 'Accept': {
          await AcceptActivity(body, remoteUser, user)
          break
        }
        case 'Announce': {
          await AnnounceActivity(body, remoteUser, user)
          break
        }
        case 'Create': {
          await CreateActivity(body, remoteUser, user)
          break
        }
        case 'Follow': {
          await FollowActivity(body, remoteUser, user)
          break
        }
        case 'Update': {
          await UpdateActivity(body, remoteUser, user)
          break
        }
        case 'Undo': {
          await UndoActivity(body, remoteUser, user)
          break
        }
        case 'Like': {
          await LikeActivity(body, remoteUser, user)
          break
        }
        case 'Delete': {
          await DeleteActivity(body, remoteUser, user)
          break
        }
        case 'EmojiReact': {
          await EmojiReactActivity(body, remoteUser, user)
          break
        }
        case 'Remove': {
          await RemoveActivity(body, remoteUser, user)
          break
        }
        case 'Add': {
          await AddActivity(body, remoteUser, user)
          break
        }
        case 'Block': {
          await BlockActivity(body, remoteUser, user)
          break
        }

        case 'Move': {
          await MoveActivity(body, remoteUser, user)
          break
        }

        // activities that we ignore:
        case 'CacheFile':
        case 'View': {
          await signAndAccept(req, remoteUser, user)
          break
        }

        default: {
          logger.info(`NOT IMPLEMENTED: ${req.body.type}`)
          logger.info(req.body)
        }
      }
    }
  } catch (err) {
    logger.debug(err)
    const error = new Error('error')
  }
}

export { inboxWorker }
