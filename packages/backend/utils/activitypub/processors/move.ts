import { activityPubObject } from '../../../interfaces/fediverse/activityPubObject'

async function MoveActivity(body: any, remoteUser: any, user: any) {
  // WIP move
  // TODO get list of users who where following old account
  // then make them follow the new one, sending petition
  const apObject: activityPubObject = body.object
  logger.warn({ message: 'moving user being ignored', object: req.body })
  /*
          const newUser = await getRemoteActor(req.body.object, user)
          const followsToMove = await Follows.findAll({
            where: {
              followedId: remoteUser.id,
              accepted: true,
              [Op.and]: [
                {
                  followerId: {
                    [Op.notIn]: await Follows.findAll({
                      where: {
                        followedId: newUser.id
                      }
                    })
                  }
                },
                {
                  followerId: { [Op.in]: await getAllLocalUserIds() }
                }
              ]
            }
          })
          if (followsToMove && newUser) {
            const newFollows = followsToMove.map((elem: any) => {
              return follow(elem.followerId, newUser.id)
            })
            await Promise.allSettled(newFollows)
          }
          await signAndAccept(req, remoteUser, user)*/
}

export { MoveActivity }
