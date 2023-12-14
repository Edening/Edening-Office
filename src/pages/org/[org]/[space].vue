<script setup>
import { nextTick, getCurrentInstance, watch, onMounted, ref } from 'vue'

import RTCMultiConnection from '/assets/lib/RTCMultiConnection'

import socketIO from '/assets/lib/socket.io'  // This line is pretty important :)

const loading = ref(false)

let lobbyRoomId = 'Lobby'
let seatsRoomId = ref('Seats')
let meetingRoomId = ref('Meeting')

const lobbyUsers = ref([])
const seatsUsers = ref([])
const meetingUsers = ref([])

const meetingSeats1 = ref([
  {
    id: 'meetingSeat1',
    status: 'vacant'
  },
  {
    id: 'meetingSeat2',
    status: 'vacant'
  },
  {
    id: 'meetingSeat3',
    status: 'vacant'
  },
  {
    id: 'meetingSeat4',
    status: 'vacant'
  },
  {
    id: 'meetingSeat5',
    status: 'vacant'
  },
  {
    id: 'meetingSeat6',
    status: 'vacant'
  }
])
const meetingSeats2 = ref([
  {
    id: 'meetingSeat7',
    status: 'vacant'
  },
  {
    id: 'meetingSeat8',
    status: 'vacant'
  },
  {
    id: 'meetingSeat9',
    status: 'vacant'
  },
  {
    id: 'meetingSeat10',
    status: 'vacant'
  },
  {
    id: 'meetingSeat11',
    status: 'vacant'
  },
  {
    id: 'meetingSeat12',
    status: 'vacant'
  },
])

const switchingRoom = ref(true)

const router = useRouter()

const lobbyAnimationClass = ref('fadeInLeft')
const seatsAnimationClass = ref('fadeInDown')
const meetingAnimationClass = ref('fadeInRight')

var connection
var myVideo
var seatTakenTimer
var justJoined
const seated = ref(false)

const inRoom = ref('Lobby')

const hasReception = ref(false)

const decorating = ref(false)

const supabase = useSupabaseClient()

const user = useSupabaseUser()

const route = useRoute()

const orgID = ref('')
const orgName = ref(route.params.org)
const spaceName = ref(route.params.space)
const orgFullName = ref('')
const orgOwner = ref('')
  
const orgSpace = ref({})

const show_error = ref(null)

const entranceToConnect = ref({})
const spaceSearchResult = ref([])
const userSearchResult  = ref([])
const cubeToAssign = ref({})

const getOrgnization = async () => {
  loading.value = true

  const { data, error } = await supabase
    .from('organizations')
    .select()
    .eq('name', orgName.value)

  loading.value = false

  if(data && data.length == 1) {
    orgID.value = data[0].id
    orgFullName.value = data[0].full_name
    orgOwner.value = data[0].owner
  }

  if(error)
      show_error.value = error
}

const openOrJoin = (roomId) => {
  loading.value = true

  connection.extra = {
    roomId: roomId
  }

  connection.openOrJoin(roomId)

  loading.value = false
}

const switchRoom = (newRoomId) => {
  loading.value = true

  if (switchingRoom.value && inRoom.value != newRoomId) {

    if (newRoomId == seatsRoomId.value) {
      lobbyAnimationClass.value = 'none'
      seatsAnimationClass.value = 'fadeInDown'
    } else if(newRoomId == lobbyRoomId) {
      lobbyAnimationClass.value = 'fadeInUp'
      seatsAnimationClass.value = 'none'
    }

    inRoom.value = newRoomId

    // disconnect with all users
    connection.getAllParticipants().forEach(function(pid) {
        connection.disconnectWith(pid);
    });

    // stop all local cameras
    connection.attachStreams.forEach(function(localStream) {
        localStream.stop();
    });

    // close socket.io connection
    connection.closeSocket();

    openOrJoin(newRoomId)
  }

  loading.value = false
}

const takeSeat = (id, reception, leavingRoom, event) => {

  event.stopImmediatePropagation()

  switchingRoom.value = false

  if (myVideo) {
    sit(myVideo.id, id, reception)
    seated.value = true

    if(!leavingRoom) {
      seatTakenTimer = setInterval(() => {
        connection.send({
          type: 'seatTaken',
          userid: myVideo.id,
          seatid: id,
          reception: reception
        })
      }, 1000)
    }
  }
}

/* This(sit0) implementation brought a huge issue which made 'Leave' disappear in a weird way.
*  After many days/nights of painful debugging, the issue was addressed by avoiding direct DOM manipulation.
*  So, don't mess up DOM operation with Vue logic whenever possible!!!
*/
const sit0 = (userid, seatid, reception) => {

console.log('orgSpace.value.facilities.cubes: ')
orgSpace.value.facilities.cubes.forEach((cube) => {
  console.log('Seat-' + cube.id + ' by User-' + (cube.media && cube.media.id) + '\n')
})

var userFound = lobbyUsers.value.find((video) => video.id == userid) || seatsUsers.value.find((video) => video.id == userid)
if(userFound) {
  lobbyAnimationClass.value = 'none'
  seatsAnimationClass.value = 'none'

  // 1. Away from open area
  // 2. Take the seat area

  var seatTaken

  if(orgSpace.value.type == 'Office') {
    if (reception) {
      lobbyUsers.value = lobbyUsers.value.filter((video) => video.id != userid)
    } else {
      seatsUsers.value = seatsUsers.value.filter((video) => video.id != userid)
    }

    seatTaken = (orgSpace.value.facilities && orgSpace.value.facilities.cubes && orgSpace.value.facilities.cubes.find((elem) => elem.id == seatid))
                    || (orgSpace.value.facilities && orgSpace.value.facilities.entrances && orgSpace.value.facilities.entrances.find((elem) => elem.id == seatid)) 
                    || (orgSpace.value.facilities && orgSpace.value.facilities.receptions && orgSpace.value.facilities.receptions.find((elem) => elem.id == seatid))
  } else if(orgSpace.value.type == 'Meeting') {
    meetingUsers.value = meetingUsers.value.filter((video) => video.id != userid)
    // lobbyUsers.value = lobbyUsers.value.filter((video) => video.id != userid)  /// Workaround for meeting room 'Leave' issue
    seatTaken = meetingSeats1.value.find((elem) => elem.id == seatid)
                    || meetingSeats2.value.find((elem) => elem.id == seatid)
                    || orgSpace.value.facilities.entrances.find((elem) => elem.id == seatid)
  }

  var videoElem = document.getElementById(userid)  /// This is probably the cause!!!
  
  if(seatTaken.status == 'vacant') {
    seatTaken.status = 'taken'
    seatTaken.media = videoElem
  }

  console.log('Seat-' + seatTaken.id + '[seatTaken.media.id:' + seatTaken.media.id + ']' + ' by User-' + userid  + '\n' + 'After sitting, orgSpace.value.facilities.cubes: ')
  orgSpace.value.facilities.cubes.forEach((cube) => {
    console.log('Seat-' + cube.id + ' by User-' + (cube.media && cube.media.id) + '\n')
  })

  // alert('userid: ' + userid + '\n' + 'seatTaken.media.id: ' + seatTaken.media.id + '\n' + 'orgSpace.cube.media.id: ' + orgSpace.value.facilities.cubes.find((elem) => elem.id == seatid).media.id)

  // alert('inRoom.value == seatsRoomId.value && myVideo.id == seatTaken.media.id: ' + (inRoom.value == seatsRoomId.value && myVideo.id == seatTaken.media.id))
}
}
const sit = (userid, seatid, reception) => {

    var userFound = lobbyUsers.value.find((video) => video.id == userid)
                    || seatsUsers.value.find((video) => video.id == userid)
                    || meetingUsers.value.find((video) => video.id == userid)
    if(userFound) {
      lobbyAnimationClass.value = 'none'
      seatsAnimationClass.value = 'none'
      meetingAnimationClass.value = 'none'

      // 1. Away from open area
      // 2. Take the seat area

      var seatTaken

      if(orgSpace.value.type == 'Office') {
        if (reception) {
          lobbyUsers.value = lobbyUsers.value.filter((video) => video.id != userid)
        } else {
          seatsUsers.value = seatsUsers.value.filter((video) => video.id != userid)
        }

        seatTaken = (orgSpace.value.facilities && orgSpace.value.facilities.cubes && orgSpace.value.facilities.cubes.find((elem) => elem.id == seatid))
                        || (orgSpace.value.facilities && orgSpace.value.facilities.entrances && orgSpace.value.facilities.entrances.find((elem) => elem.id == seatid)) 
                        || (orgSpace.value.facilities && orgSpace.value.facilities.receptions && orgSpace.value.facilities.receptions.find((elem) => elem.id == seatid))
      } else if(orgSpace.value.type == 'Meeting') {
        meetingUsers.value = meetingUsers.value.filter((video) => video.id != userid)
        seatTaken = meetingSeats1.value.find((elem) => elem.id == seatid)
                        || meetingSeats2.value.find((elem) => elem.id == seatid)
                        || orgSpace.value.facilities.entrances.find((elem) => elem.id == seatid)
      }
      
      if(seatTaken.status == 'vacant') {
        seatTaken.status = 'taken'
        seatTaken.media = userFound
      }
    }
}

const leaveSeat = (id, reception, leavingRoom, event) => {

  event.stopImmediatePropagation()

  switchingRoom.value = true

  if (myVideo) {

    if (seatTakenTimer) {
      seatTakenTimer = clearInterval(seatTakenTimer)
    }

    leave(myVideo.id, id, reception, leavingRoom)
    seated.value = false
    
    if(!leavingRoom){
      connection.send({
        type: 'leaveSeat',
        userid: myVideo.id,
        seatid: id,
        reception: reception
      })
    }
  }
}

const leave  = (userid, seatid, reception, leavingRoom) => {
    // 1. Away from seat area
    // 2. Take the open area

    var videoElem = document.getElementById(userid)

    if (videoElem) {
      justJoined = videoElem

      var seatTaken

      if(orgSpace.value.type == 'Office') {
        if (reception) {
          lobbyAnimationClass.value = 'fadeInDown'
          if(!leavingRoom && !lobbyUsers.value.find((elem) => elem.id == videoElem.id)) {
            lobbyUsers.value.push(videoElem)
          }
        } else {
          seatsAnimationClass.value = 'fadeInUp'
          if(!leavingRoom && !seatsUsers.value.find((elem) => elem.id == videoElem.id)) {
            seatsUsers.value.push(videoElem)
          }
        }
        seatTaken = (orgSpace.value.facilities && orgSpace.value.facilities.receptions && orgSpace.value.facilities.receptions.find((elem) => elem.id == seatid))
                      || (orgSpace.value.facilities && orgSpace.value.facilities.cubes && orgSpace.value.facilities.cubes.find((elem) => elem.id == seatid))
                      || (orgSpace.value.facilities && orgSpace.value.facilities.entrances && orgSpace.value.facilities.entrances.find((elem) => elem.id == seatid))
      } else if(orgSpace.value.type == 'Meeting') {
        meetingAnimationClass.value = 'fadeInUp'
        seatTaken = meetingSeats1.value.find((elem) => elem.id == seatid)
                      || meetingSeats2.value.find((elem) => elem.id == seatid)
                      || orgSpace.value.facilities.entrances.find((elem) => elem.id == seatid)
        if(!leavingRoom && !meetingUsers.value.find((elem) => elem.id == videoElem.id)) {
          meetingUsers.value.push(videoElem)
        }
      }

      if(leavingRoom) {
        lobbyAnimationClass.value = 'none'
        seatsAnimationClass.value = 'none'
        meetingAnimationClass.value = 'none'
      }
      
      seatTaken.status = 'vacant'
      seatTaken.media = null
    }
}

const enter = (entrance, event) => {

  if (!seatTakenTimer) {
    if(inRoom.value == lobbyRoomId) {
      takeSeat(entrance.id, true, true, event)
      connection.send({
          type: 'seatTaken',
          userid: myVideo.id,
          seatid: entrance.id,
          reception: true
      })
    } else {
      takeSeat(entrance.id, false, true, event)
      connection.send({
          type: 'seatTaken',
          userid: myVideo.id,
          seatid: entrance.id,
          reception: false
      })
    }

    setTimeout(() => {
      if(inRoom.value == lobbyRoomId) {
        leaveSeat(entrance.id, true, true, event)
      } else {
        leaveSeat(entrance.id, false, true, event)
      }
      connection.send({
        type: 'leaveSeat',
        userid: myVideo.id,
        seatid: entrance.id,
        reception: false,
        leavingRoom: true
      })
      router.push('/org/' + entrance.space.organizations.name + '/' + entrance.space.name)
    }, 3500)
  }
}

const toggleReception = (event) => {
  hasReception.value = event.target.checked
  if(hasReception.value) {
    orgSpace.value.facilities.receptions = orgSpace.value.facilities.receptions || []
  }
}

const toggleDecoration = (event) => {
  decorating.value = event.target.checked
  if(decorating.value) {
    orgSpace.value.facilities = orgSpace.value.facilities || {}
    orgSpace.value.facilities.cubes = orgSpace.value.facilities.cubes || []
    orgSpace.value.facilities.entrances = orgSpace.value.facilities.entrances || []
  }
}

const addCube = (event) => {

  event.stopImmediatePropagation()

  const cube = {
    id: crypto.randomUUID(),
    status: 'vacant'
  }

  orgSpace.value.facilities.cubes.push(cube)
}

const addEntrance = (event) => {

  event.stopImmediatePropagation()

  const entrance = {
    id: crypto.randomUUID(),
    status: 'vacant'
  }

  orgSpace.value.facilities.entrances.push(entrance)
}

const setCurrentEntrance = (entrance) => {
  entranceToConnect.value = entrance
}

const connectSpace = (space) => {
  const found = orgSpace.value.facilities.entrances.find((elem) => elem.id == entranceToConnect.value.id)

  found.space = space
}

const searchSpace = async (event) => {
  loading.value = true

  const searchText = event.target.value

  const { data, error } = await supabase
    .from('spaces')
    .select('id, name, type, organizations(id, name, full_name)')
    .ilike('name', '%' + searchText + '%')

  loading.value = false

  if(data) {
    spaceSearchResult.value = data
  }

  if(error)
    show_error.value = error
}

const addReception = (event) => {

  event.stopImmediatePropagation()

  const reception = {
    id: crypto.randomUUID(),
    status: 'vacant'
  }

  orgSpace.value.facilities.receptions.push(reception)
}

const setCurrentCube = (cube) => {
  cubeToAssign.value = cube
}

const assignCubeUser = (user) => {
  const found = orgSpace.value.facilities.cubes.find((elem) => elem.id == cubeToAssign.value.id)
                  || orgSpace.value.facilities.receptions.find((elem) => elem.id == cubeToAssign.value.id)

  found.owner = user
}

const removeCube = (cube, reception) => {
  if(reception) {
    orgSpace.value.facilities.receptions = orgSpace.value.facilities.receptions.filter((elem) => elem.id != cube.id)
  } else {
    orgSpace.value.facilities.cubes = orgSpace.value.facilities.cubes.filter((elem) => elem.id != cube.id)
  }
}

const searchUser = async (event) => {
  loading.value = true

  const searchText = event.target.value
  const nameArray = searchText.split(" ")
  const firstName = nameArray[0]
  const lastName = nameArray[1]

  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email)')
    .ilike('first_name', '%' + firstName + '%')
    .ilike('last_name', '%' + lastName + '%')

  loading.value = false

  if(data) {
    userSearchResult.value = data
  }

  if(error)
    show_error.value = error
}

const updateSpaceFacilities = async () => {

    loading.value = true

    if(!hasReception.value) {
      orgSpace.value.facilities.receptions = null
    }

    const { error } = await supabase
        .from('spaces')
        .update({ facilities: orgSpace.value.facilities })
        .eq('id', orgSpace.value.id)

    loading.value = false

    if(error)
        show_error.value = error
}

const init = async () => {
    loading.value = true

    const { data, error } = await supabase
      .from('spaces')
      .select('id, name, type, facilities, organizations!inner(name)')
      .eq('organizations.name', orgName.value)
      .eq('name', spaceName.value)

    loading.value = false

    if(data && data.length == 1) {
      orgSpace.value = data[0]
    }

    if(error)
      show_error.value = error

    if(orgSpace.value.type == 'Office') {
      if(orgSpace.value.facilities && orgSpace.value.facilities.receptions) {
        hasReception.value = true
        inRoom.value = lobbyRoomId = orgSpace.value.id + '-' + lobbyRoomId
        openOrJoin(lobbyRoomId)
      } else {
        inRoom.value = seatsRoomId.value = orgSpace.value.id + '-' + seatsRoomId.value
        openOrJoin(seatsRoomId.value)
      }
    } else if(orgSpace.value.type == 'Meeting') {
      inRoom.value = meetingRoomId.value = orgSpace.value.id + '-' + meetingRoomId.value
      openOrJoin(meetingRoomId.value)
    }
}

onMounted(() => {

  connection = new RTCMultiConnection();

  // this line is VERY_important
  connection.socketURL = 'https://muazkhan.com:9001/';
  // connection.socketURL = 'http://localhost:9001/'

  // all below lines are optional; however recommended.

  connection.session = {
      audio: true,
      video: true,
      data: true
  };

  connection.sdpConstraints.mandatory = {
      OfferToReceiveAudio: true,
      OfferToReceiveVideo: true
  };

  connection.onstream = function(event) {
    
    if (event.type === 'local') {
      myVideo = event.mediaElement
    }
    else {
      justJoined = event.mediaElement
    }

    switch (event.extra.roomId) {
      case lobbyRoomId: 
        lobbyUsers.value.push(event.mediaElement)
        break
      case seatsRoomId.value: 
        seatsUsers.value.push(event.mediaElement)
        break
      case meetingRoomId.value: 
        meetingUsers.value.push(event.mediaElement)
        break
    }

  };

  connection.onstreamended = (event) => {

    if (event.type == 'local') {
      myVideo = null

      if (seatTakenTimer) {
        seatTakenTimer = clearInterval(seatTakenTimer)
      }
    }

    var seatTaken

    switch (event.extra.roomId) {
      case lobbyRoomId: 
        seatTaken = orgSpace.value.facilities && orgSpace.value.facilities.receptions && orgSpace.value.facilities.receptions.find((elem) => elem.media && elem.media.id == event.streamid)
        if(seatTaken) {
          seatTaken.status = 'vacant'
          seatTaken.media = null
        } else {
          lobbyUsers.value = lobbyUsers.value.filter((video) => video.id != event.streamid)
        }
        break
      case seatsRoomId.value:
        seatTaken = orgSpace.value.facilities && orgSpace.value.facilities.cubes && orgSpace.value.facilities.cubes.find((elem) => elem.media && elem.media.id == event.streamid)
        if(seatTaken) {
          seatTaken.status = 'vacant'
          seatTaken.media = null
        } else { 
          seatsUsers.value = seatsUsers.value.filter((video) => video.id != event.streamid)
        }
        break
      case meetingRoomId.value: 
        seatTaken = meetingSeats1.value.find((elem) => elem.media && elem.media.id == event.streamid)
                      || meetingSeats2.value.find((elem) => elem.media && elem.media.id == event.streamid)
        if(seatTaken) {
          seatTaken.status = 'vacant'
          seatTaken.media = null
        } else {
          meetingUsers.value = meetingUsers.value.filter((video) => video.id != event.streamid)
        }
        break
    }

  }

  connection.onmessage = (event) => {

    const data = event.data

    if (data.type == 'seatTaken') {
      sit(data.userid, data.seatid, data.reception)
    } else if (data.type == 'leaveSeat') {
      leave(data.userid, data.seatid, data.reception, data.leavingRoom)
    }
  }

  getOrgnization()
  
  init()
})
</script>

<template>
<div class="hero min-h-screen bg-base-200">
  
  <div style="width: 100%;">

    <div class="h-20"></div>

    <span v-if="loading" class="loading loading-spinner text-info"></span>
    <div v-show="show_error" class="alert alert-error">
      <pre>Error: {{ show_error }}</pre>
    </div>

    <div class="alert alert-info">
      <span><b>{{ $route.params.space }}</b></span>
    </div>

    <br/>

    <div v-if="user && user.id == orgOwner" class="form-control w-52">
      <label class="cursor-pointer label">
        <span class="label-text">Decorate</span> 
        <input @change="toggleDecoration" type="checkbox" class="toggle toggle-success" />
        <button v-if="decorating" @click="updateSpaceFacilities" class="btn btn-info">Submit</button>
      </label>
    </div>
    
    <dialog id="modal_connect" class="modal">
      <div class="modal-box">
        <form method="dialog">
          <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        </form>
        <h3 class="font-bold text-lg">Search:</h3>
        <input @change="searchSpace" type="text" placeholder="Type Space Name" class="input input-bordered input-info w-full max-w-xs" />
        <div>
          <span><b>Result:</b></span>
          <hr>
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Org</th>
                  <th>Org Full Name</th>
                </tr>
              </thead>
              <tbody>
                <tr @click="connectSpace(space)" v-for="space in spaceSearchResult">
                  <td>{{ space.name }}</td>
                  <td>{{ space.type  }}</td>
                  <td>{{ space.organizations.name  }}</td>
                  <td>{{ space.organizations.full_name  }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </dialog>

    <div v-if="orgSpace.type == 'Office'">

      <dialog id="modal_assign" class="modal">
        <div class="modal-box">
          <form method="dialog">
            <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
          </form>
          <h3 class="font-bold text-lg">Search:</h3>
          <input @change="searchUser" type="text" placeholder="Type User Name" class="input input-bordered input-info w-full max-w-xs" />
          <div>
            <span><b>Result:</b></span>
            <hr>
            <div class="overflow-x-auto">
              <table class="table table-zebra">
                <thead>
                  <tr>
                    <th>First Name</th>
                    <th>Last Name</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  <tr @click="assignCubeUser(user)" v-for="user in userSearchResult">
                    <td>{{ user.first_name }}</td>
                    <td>{{ user.last_name  }}</td>
                    <td>{{ user.email }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </dialog>

      <div v-if="decorating" class="form-control w-52">
        <label class="cursor-pointer label">
          <span class="label-text">Reception</span>
          <input v-if="hasReception" @change="toggleReception" type="checkbox" class="toggle toggle-success" checked /> 
          <input v-else @change="toggleReception" type="checkbox" class="toggle toggle-success" />
        </label>
      </div>
      <div>
        <var-row :gutter="[0, 150]">
          <var-col :span="18" direction="column">
            <div v-if="hasReception" @click="switchRoom(lobbyRoomId)" style="height: 350px;">
              <div transition-duration="3.3s" item-selector=".video-item" class="video-list" style="height: 200px;">
                <div v-if="orgSpace.facilities && orgSpace.facilities.receptions" v-for="seat in orgSpace.facilities.receptions">
                    <var-card v-if="seat.status == 'vacant'" :id="seat.id" fit="contain" src="/images/reception.png" class="reception-card-image">
                      <template #extra>
                        <var-space v-if="seat.owner">
                          {{ seat.owner.first_name }}&nbsp;{{ seat.owner.last_name }}
                        </var-space>
                        <var-space v-else>
                          &nbsp;
                        </var-space>
                        <div v-if="decorating">
                          <button class="btn" onclick="modal_assign.showModal()" @click="setCurrentCube(seat); $event.stopImmediatePropagation()"><i class="las la-user text-2xl"></i></button>
                          <button class="btn" @click="removeCube(seat, true); $event.stopImmediatePropagation()"><i class="las la-trash-alt text-2xl"></i></button>
                        </div>
                        <var-space v-if="inRoom == lobbyRoomId && !seated">
                          <var-button @click="takeSeat(seat.id, true, false, $event)" text type="warning" class="sit-button">Sit</var-button>
                        </var-space>
                        <var-space v-else>
                          <var-button text class="sit-button"></var-button>
                        </var-space>
                      </template>
                    </var-card>
                    <var-card v-else-if="seat.status == 'taken'" :id="seat.id" fit="contain" class="reception-card-image">
                      <template #image>
                        <video style="width: 17rem; height: 8rem;" class="reception-video animate__animated animate__pulse animate__faster"  autoplay playsinline :id="seat.media.id" :srcObject="seat.media.srcObject"></video>
                      </template>
                      <template #extra>
                        <var-space v-if="seat.owner">
                          {{ seat.owner.first_name }}&nbsp;{{ seat.owner.last_name }}
                        </var-space>
                        <var-space v-else>
                          &nbsp;
                        </var-space>
                        <div v-if="decorating">
                          <button class="btn" onclick="modal_assign.showModal()" @click="setCurrentCube(seat); $event.stopImmediatePropagation()"><i class="las la-user text-2xl"></i></button>
                          <button class="btn" @click="removeCube(seat, true); $event.stopImmediatePropagation()"><i class="las la-trash-alt text-2xl"></i></button>
                        </div>
                        <var-space v-if="inRoom == lobbyRoomId && myVideo.id == seat.media.id">
                          <var-button @click="leaveSeat(seat.id, true, false, $event)" text type="warning" class="sit-button">Leave</var-button>
                        </var-space>
                        <var-space v-else>
                          <var-button text class="sit-button"></var-button>
                        </var-space>
                      </template>
                    </var-card>
                </div>

                <div v-if="decorating && orgSpace.facilities && orgSpace.facilities.receptions && orgSpace.facilities.receptions.length < 3" @click="addReception($event)">
                  <figure>
                    <img src="/images/add.png" alt="Add Reception" />
                    <figcaption style="text-align: center;"><b>Add Reception</b></figcaption>
                  </figure>
                </div>
              </div>
              <div class="video-list">
                <div v-for="item in lobbyUsers" class="reception-video" style="height: 150px;">
                  <video v-if="lobbyAnimationClass == 'fadeInLeft' && (!justJoined || item.id == justJoined.id)" class="animate__animated animate__fadeInLeft" autoplay playsinline :muted="item.muted" :id="item.id" :srcObject="item.srcObject"></video>&nbsp;
                  <video v-else-if="lobbyAnimationClass == 'fadeInDown' && (!justJoined || item.id == justJoined.id)" class="animate__animated animate__fadeInDown" autoplay playsinline :muted="item.muted" :id="item.id" :srcObject="item.srcObject"></video>&nbsp;
                  <video v-else-if="lobbyAnimationClass == 'fadeInUp' && (!justJoined || item.id == justJoined.id)" class="animate__animated animate__fadeInUp" autoplay playsinline :muted="item.muted" :id="item.id" :srcObject="item.srcObject"></video>&nbsp;
                  <video v-else autoplay playsinline :muted="item.muted" :id="item.id" :srcObject="item.srcObject"></video>&nbsp;
                </div>
              </div>
            </div>
            <hr>
            <br/>
            <div @click="switchRoom(seatsRoomId)">
              <div class="video-list" style="height: 135px;">
                  <div v-for="item in seatsUsers" class="cube-video">
                    <video v-if="seatsAnimationClass == 'fadeInDown' && (!justJoined || item.id == justJoined.id)" class="animate__animated animate__fadeInDown" autoplay playsinline :muted="item.muted" :id="item.id" :srcObject="item.srcObject"></video>&nbsp;
                    <video v-else-if="seatsAnimationClass == 'fadeInUp' && (!justJoined || item.id == justJoined.id)" class="animate__animated animate__fadeInUp" autoplay playsinline :muted="item.muted" :id="item.id" :srcObject="item.srcObject"></video>&nbsp;
                    <video v-else autoplay playsinline :muted="item.muted" :id="item.id" :srcObject="item.srcObject"></video>&nbsp;
                  </div>
              </div>
              <div class="video-list">
                  <div class="grid grid-cols-6 gap-x-0 gap-y-32">
                    <div v-if="orgSpace.facilities && orgSpace.facilities.cubes" v-for="seat in orgSpace.facilities.cubes">
                        <var-card v-if="seat.status == 'vacant'" :id="seat.id" fit="contain" src="/images/cube.png" class="cube-card-image">
                          <template #extra>
                            <var-space v-if="seat.owner">
                              {{ seat.owner.first_name }}&nbsp;{{ seat.owner.last_name }}
                            </var-space>
                            <var-space v-else>
                              &nbsp;
                            </var-space>
                            <div v-if="decorating">
                              <button class="btn" onclick="modal_assign.showModal()" @click="setCurrentCube(seat); $event.stopImmediatePropagation()"><i class="las la-user text-2xl"></i></button>
                              <button class="btn" @click="removeCube(seat, false); $event.stopImmediatePropagation()"><i class="las la-trash-alt text-2xl"></i></button>
                            </div>
                            <var-space v-if="inRoom == seatsRoomId && !seated">
                              <var-button @click="takeSeat(seat.id, false, false, $event)" text type="warning" class="sit-button">Sit</var-button>
                            </var-space>
                            <var-space v-else>
                              <var-button text class="sit-button"></var-button>
                            </var-space>
                          </template>
                        </var-card>
                        <var-card v-else-if="seat.status == 'taken'" :id="seat.id" fit="contain" class="cube-card-image">
                          <template #image>
                            <video style="width: 16rem; height: 8rem;" class="cube-video animate__animated animate__pulse animate__faster"  autoplay playsinline :id="seat.media.id" :srcObject="seat.media.srcObject"></video>
                          </template>
                          <template #extra>
                            <var-space v-if="seat.owner">
                              {{ seat.owner.first_name }}&nbsp;{{ seat.owner.last_name }}
                            </var-space>
                            <var-space v-else>
                              &nbsp;
                            </var-space>
                            <div v-if="decorating">
                              <button class="btn" onclick="modal_assign.showModal()" @click="setCurrentCube(seat); $event.stopImmediatePropagation()"><i class="las la-user text-2xl"></i></button>
                              <button class="btn" @click="removeCube(seat, false); $event.stopImmediatePropagation()"><i class="las la-trash-alt text-2xl"></i></button>
                            </div>
                            <var-space v-if="inRoom == seatsRoomId && myVideo.id == seat.media.id">
                              <var-button @click="leaveSeat(seat.id, false, false, $event)" text type="warning" class="sit-button">Leave</var-button>
                            </var-space>
                            <var-space v-else>
                              <var-button text class="sit-button"></var-button>
                            </var-space>
                          </template>
                        </var-card>
                    </div>
                    <!-- <div v-if="orgSpace.facilities && orgSpace.facilities.cubes" v-for="seat in orgSpace.facilities.cubes">
                      <div v-if="seat.status == 'vacant'" :id="seat.id" class="card card-compact w-66 bg-base-100 shadow-xl">
                        <figure><img src="/images/cube.png" alt="Cube" class="cube-video"/></figure>
                        <div class="card-body">
                          <h2 v-if="seat.owner" class="card-title">{{ seat.owner.first_name }}&nbsp;{{ seat.owner.last_name }}</h2>
                          <div v-if="decorating">
                            <button class="btn" onclick="modal_assign.showModal()" @click="setCurrentCube(seat); $event.stopImmediatePropagation()"><i class="las la-user text-2xl"></i></button>
                            <button class="btn" @click="removeCube(seat, false); $event.stopImmediatePropagation()"><i class="las la-trash-alt text-2xl"></i></button>
                          </div>
                          <div v-if="inRoom == seatsRoomId && !seated" class="card-actions justify-end">
                            <button @click="takeSeat(seat.id, false, false, $event)" class="btn btn-primary">Sit</button>
                          </div>
                        </div>
                      </div>
                      <div v-else-if="seat.status == 'taken'" :id="seat.id" class="card card-compact w-66 bg-base-100 shadow-xl">
                        <figure><video style="width: 16rem; height: 8rem;" class="cube-video animate__animated animate__pulse animate__faster"  autoplay playsinline :id="seat.media.id" :srcObject="seat.media.srcObject"></video></figure>
                        <div class="card-body">
                          <h2 v-if="seat.owner" class="card-title">{{ seat.owner.first_name }}&nbsp;{{ seat.owner.last_name }}</h2>
                          <div v-if="decorating">
                            <button class="btn" onclick="modal_assign.showModal()" @click="setCurrentCube(seat); $event.stopImmediatePropagation()"><i class="las la-user text-2xl"></i></button>
                            <button class="btn" @click="removeCube(seat, false); $event.stopImmediatePropagation()"><i class="las la-trash-alt text-2xl"></i></button>
                          </div>
                          <div v-if="inRoom == seatsRoomId && myVideo.id == seat.media.id" class="card-actions justify-end">
                            <button @click="leaveSeat(seat.id, false, false, $event)" class="btn btn-primary">Leave</button>
                          </div>
                        </div>
                      </div>
                    </div> -->
                  </div>
                  <div v-if="decorating && orgSpace.facilities && orgSpace.facilities.cubes && orgSpace.facilities.cubes.length < 18" @click="addCube($event)">
                    <figure>
                      <img src="/images/add.png" alt="Add Cube" />
                      <figcaption style="text-align: center;"><b>Add Cube</b></figcaption>
                    </figure>
                  </div>
              </div>
            </div>
          </var-col>
          <var-col :span="6">
                <div class="video-list">
                  <div class="space-y-16 gap-6 column-1">
                    <div v-if="orgSpace.facilities && orgSpace.facilities.entrances" v-for="entrance in orgSpace.facilities.entrances">
                        <var-card v-if="entrance.status == 'vacant'" :id="entrance.id" fit="contain" @click="enter(entrance, $event)" src="/images/entrance.png">
                          <template #extra>
                            <var-space v-if="entrance.space">
                              {{ entrance.space.organizations.name }}/{{ entrance.space.name }}
                            </var-space>
                            <div v-if="decorating">
                              <button class="btn" onclick="modal_connect.showModal()" @click="setCurrentEntrance(entrance); $event.stopImmediatePropagation()"><i class="las la-network-wired text-2xl"></i></button>
                            </div>
                          </template>
                        </var-card>
                        <var-card v-else-if="entrance.status == 'taken'" :id="entrance.id" fit="contain" >
                          <template #image>
                            <video class="animate__animated animate__zoomOut animate__delay-3s"  autoplay playsinline :id="entrance.media.id" :srcObject="entrance.media.srcObject" style="width: 310px; height: 200px;"></video>
                          </template>
                          <template #extra>
                            <var-space v-if="entrance.space">
                              {{ entrance.space.organizations.name }}/{{ entrance.space.name }}
                            </var-space>
                            <div v-if="decorating">
                              <button class="btn" onclick="modal_connect.showModal()" @click="setCurrentEntrance(entrance); $event.stopImmediatePropagation()"><i class="las la-network-wired text-2xl"></i></button>
                            </div>
                          </template>
                        </var-card>
                    </div>
                  </div>
                  <div v-if="decorating" @click="addEntrance($event)">
                      <figure>
                        <img src="/images/add.png" alt="Add Entrance" />
                        <figcaption style="text-align: center;"><b>Add Entrance</b></figcaption>
                      </figure>
                  </div>
                </div>
          </var-col>
        </var-row>
      </div>
  </div>

  <div v-else-if="orgSpace.type == 'Meeting'">
    <var-row :gutter="[0,60]">
      <var-col :span="18" direction="column">
        <div class="video-list" style="height: 150px;">
              <div v-for="item in meetingUsers">
                <video v-if="meetingAnimationClass == 'fadeInRight' && (!justJoined || item.id == justJoined.id)" class="animate__animated animate__fadeInRight" autoplay playsinline :muted="item.muted" :id="item.id" :srcObject="item.srcObject" style="width: 8rem; height: 8rem;"></video>&nbsp;
                <video v-else-if="meetingAnimationClass == 'fadeInUp' && (!justJoined || item.id == justJoined.id)" class="animate__animated animate__fadeInUp" autoplay playsinline :muted="item.muted" :id="item.id" :srcObject="item.srcObject" style="width: 8rem; height: 8rem;"></video>&nbsp;
                <video v-else autoplay playsinline :muted="item.muted" :id="item.id" :srcObject="item.srcObject" style="width: 8rem; height: 8rem;"></video>&nbsp;
              </div>
        </div>
        <div class="grid grid-cols-6">
          <div v-for="seat in meetingSeats1">
              <var-card v-if="seat.status == 'vacant'" :id="seat.id" fit="contain" src="/images/chair0.png" class="seat-card-image card-footer">
                <template #extra>
                  <var-space v-if="!seated">
                    <var-button @click="takeSeat(seat.id, false, false, $event)" text type="warning" class="sit-button">Sit</var-button>
                  </var-space>
                  <var-space v-else>
                      <var-button text class="sit-button"></var-button>
                  </var-space>
                </template>
              </var-card>
              <var-card v-else-if="seat.status == 'taken'" :id="seat.id" fit="contain" class="seat-card-image card-footer">
                <template #image>
                  <video class="seat-video animate__animated animate__pulse animate__faster" autoplay playsinline :id="seat.media.id" :srcObject="seat.media.srcObject"></video>
                </template>
                <template #extra>
                  <var-space v-if="myVideo.id == seat.media.id">
                    <var-button @click="leaveSeat(seat.id, false, false, $event)" text type="warning" class="sit-button">Leave</var-button>
                  </var-space>
                  <var-space v-else>
                    <var-button text class="sit-button"></var-button>
                  </var-space>
                </template>
              </var-card>
          </div>
        </div>
        <div class="grid grid-cols-1">
          <img src="/images/table0.png" style="width: 100%; height: 25rem;"/>
        </div>
        <div class="grid grid-cols-6">
          <div v-for="seat in meetingSeats2">
              <var-card v-if="seat.status == 'vacant'" :id="seat.id" fit="contain" src="/images/chair3.png" class="seat-card-image card-footer">
                <template #extra>
                  <var-space v-if="!seated">
                    <var-button @click="takeSeat(seat.id, false, false, $event)" text type="warning" class="sit-button">Sit</var-button>
                  </var-space>
                  <var-space v-else>
                    <var-button text class="sit-button"></var-button>
                  </var-space>
                </template>
              </var-card>
              <var-card v-else-if="seat.status == 'taken'" :id="seat.id" fit="contain" class="seat-card-image card-footer">
                <template #image>
                  <video class="seat-video animate__animated animate__pulse animate__faster" autoplay playsinline :id="seat.media.id" :srcObject="seat.media.srcObject"></video>
                </template>
                <template #extra>
                  <var-space v-if="inRoom == meetingRoomId && myVideo.id == seat.media.id">
                    <var-button @click="leaveSeat(seat.id, false, false, $event)" text type="warning" class="sit-button">Leave</var-button>
                  </var-space>
                  <var-space v-else>
                    <var-button text class="sit-button"></var-button>
                  </var-space>
                </template>
              </var-card>
          </div>
        </div>
      </var-col>
      <var-col :span="6">
        <div class="video-list">
          <div class="column-1">
            <div v-if="orgSpace.facilities && orgSpace.facilities.entrances" v-for="entrance in orgSpace.facilities.entrances">
                <var-card v-if="entrance.status == 'vacant'" :id="entrance.id" fit="contain" @click="enter(entrance, $event)" src="/images/entrance.png">
                  <template #extra>
                    <var-space v-if="entrance.space">
                      {{ entrance.space.organizations.name }}/{{ entrance.space.name }}
                    </var-space>
                    <div v-if="decorating">
                      <button class="btn" onclick="modal_connect.showModal()" @click="setCurrentEntrance(entrance); $event.stopImmediatePropagation()"><i class="las la-network-wired text-2xl"></i></button>
                    </div>
                  </template>
                </var-card>
                <var-card v-else-if="entrance.status == 'taken'" :id="entrance.id" fit="contain" >
                  <template #image>
                    <video class="animate__animated animate__zoomOut animate__delay-3s"  autoplay playsinline :id="entrance.media.id" :srcObject="entrance.media.srcObject" style="width: 310px; height: 200px;"></video>
                  </template>
                  <template #extra>
                    <var-space v-if="entrance.space">
                      {{ entrance.space.organizations.name }}/{{ entrance.space.name }}
                    </var-space>
                  </template>
                </var-card>
            </div>
            <div v-if="decorating" @click="addEntrance($event)">
              <figure>
                <img src="/images/add.png" alt="Add Entrance" />
                <figcaption style="text-align: center;"><b>Add Entrance</b></figcaption>
              </figure>
            </div>
          </div>
        </div>
      </var-col>
    </var-row>
  </div>

</div>
  
</div>
</template>

<style scoped>
.video-list {
        background: whitesmoke;
        height: 100%;
        display: flex;
        flex-direction: row;
        justify-content: center;
        flex-wrap: wrap;
    }

        .video-list div {
            padding: 0px;
        }

    .video-item {
        background: #c5c4c4;
        display: inline-block;
    }
.seat-card-image {
  --card-image-height: 8rem;
}

.seat-video {
  height: 8.1rem;
}

.cube-video {
  width: 11rem; 
  height: 6rem;
}

.cube-card-image {
  --card-image-width: 16rem;
  --card-image-height: 8rem;
}

.reception-video {
  width: 11rem; 
  height: 6rem;
}

.reception-card-image {
  --card-image-width: 17rem;
  --card-image-height: 8rem;
}

.card-footer {
  --card-footer-margin: 0px 0 0px 0
}

.meeting-video {
  width: 9rem; 
  height: 6rem;
}

.sit-button {
  height: 1rem;
}
</style>
