/*
 * <<
 * Davinci
 * ==
 * Copyright (C) 2016 - 2017 EDP
 * ==
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * >>
 */

import { takeLatest, takeEvery } from 'redux-saga'
import { call, fork, put, all } from 'redux-saga/effects'

import request from '../../utils/request'
import api from '../../utils/api'
import { readObjectAdapter, readListAdapter } from '../../utils/asyncAdapter'
import { getDefaultSlideParams } from '../../assets/json/slideSettings'

const message = require('antd/lib/message')

import {
  ActionTypes
} from './constants'
import {
  loadDisplays,
  displaysLoaded,
  loadDisplaysFail,

  loadDisplayDetail,
  displayDetailLoaded,

  displayAdded,
  addDisplayFail,
  displayEdited,
  editDisplayFail,
  currentDisplayEdited,
  editCurrentDisplayFail,
  currentSlideEdited,
  editCurrentSlideFail,
  currentSlideCoverUploaded,
  uploadCurrentSlideCoverFail,
  displayDeleted,
  deleteDisplayFail,

  displayLayersAdded,
  addDisplayLayersFail,
  displayLayersDeleted,
  deleteDisplayLayersFail,
  displayLayersEdited,
  editDisplayLayersFail,

  slideLayersPasted,
  pasteSlideLayersFail,

  undoOperationDone,
  undoOperationFail,
  redoOperationDone,
  redoOperationFail,

  displaySecretLinkLoaded,
  displayShareLinkLoaded,
  loadDisplayShareLinkFail
} from './actions'

export function* getDisplays (action): IterableIterator<any> {
  const { projectId } = action.payload
  try {
    const asyncData = yield call(request, `${api.display}?projectId=${projectId}`)
    const displays = readListAdapter(asyncData)
    yield put(displaysLoaded(displays))
  } catch (err) {
    yield put(loadDisplaysFail(err))
  }
}

export function* addDisplay (action) {
  const { display, resolve } = action.payload
  try {
    const asyncDisplayData = yield call(request, api.display, {
      method: 'post',
      data: display
    })
    const resultDisplay = readObjectAdapter(asyncDisplayData)
    const { id } = resultDisplay
    const slide = {
      displayId: id,
      index: 0,
      config: JSON.stringify({ slideParams: getDefaultSlideParams() })
    }
    yield call(request, `${api.display}/${id}/slides`, {
      method: 'post',
      data: slide
    })
    yield put(displayAdded(resultDisplay))
    resolve()
  } catch (err) {
    yield put(addDisplayFail())
    message.error('添加 Display 失败，请稍后再试')
  }
}

export function* getDisplayDetail (action): IterableIterator<any> {
  const { id } = action.payload
  try {
    const asyncDataDetail = yield call(request, `${api.display}/${id}/slides`)
    const display = readObjectAdapter(asyncDataDetail)
    const slide = display.slides[0]
    delete display.slides
    const asyncDataWidgets = yield call(request, `${api.display}/${id}/slides/${slide.id}/widgets`)
    const layers = readListAdapter(asyncDataWidgets)
    yield put(displayDetailLoaded(display, slide, layers))
    return display
  } catch (err) {
    yield put(loadDisplaysFail(err))
  }
}

export function* editDisplay (action): IterableIterator<any> {
  const { display, resolve } = action.payload
  try {
    yield call(request, `${api.display}/${display.id}`, {
      method: 'put',
      data: display
    })
    yield put(displayEdited(display))
    if (resolve) { resolve() }
  } catch (err) {
    yield put(editDisplayFail(err))
    message.error(err)
  }
}

export function* editCurrentDisplay (action): IterableIterator<any> {
  const { display, resolve } = action.payload
  try {
    yield call(request, `${api.display}/${display.id}`, {
      method: 'put',
      data: display
    })
    yield put(currentDisplayEdited(display))
    if (resolve) { resolve() }
  } catch (err) {
    yield put(editCurrentDisplayFail(err))
    message.error(err)
  }
}

export function* editCurrentSlide (action): IterableIterator<any> {
  const { displayId, slide, resolve } = action.payload
  try {
    yield call(request, `${api.display}/${displayId}/slides`, {
      method: 'put',
      data: [{
        ...slide,
        displayId
      }]
    })
    yield put(currentSlideEdited(slide))
  } catch (err) {
    yield put(editCurrentSlideFail(err))
    message.error(err)
  }
}

export function* uploadCurrentSlideCover (action): IterableIterator<any> {
  const { cover, resolve } = action.payload
  try {
    const formData = new FormData()
    formData.append('coverImage', new File([cover], 'coverImage.png'))
    const asyncData = yield call(request, `${api.display}/upload/coverImage`, {
      method: 'post',
      data: formData
    })
    const coverPath = readObjectAdapter(asyncData)
    yield put(currentSlideCoverUploaded(coverPath))
    resolve(coverPath)
  } catch (err) {
    yield put(uploadCurrentSlideCoverFail(err))
    message.error(err)
  }
}

export function* deleteDisplay (action) {
  const { id } = action.payload
  try {
    yield call(request, `${api.display}/${id}`, {
      method: 'delete'
    })
    yield put(displayDeleted(id))
  } catch (err) {
    yield put(deleteDisplayFail())
    message.error('删除当前 Display 失败，请稍后再试')
  }
}

export function* addDisplayLayers (action) {
  const { displayId, slideId, layers } = action.payload
  try {
    const asyncData = yield call(request, `${api.display}/${displayId}/slides/${slideId}/widgets`, {
      method: 'post',
      data: layers
    })
    const result = readListAdapter(asyncData)
    yield put(displayLayersAdded(result))
    return result
  } catch (err) {
    yield put(addDisplayLayersFail())
    message.error('当前 Display 添加图层失败，请稍后再试')
  }
}

export function* editDisplayLayers (action) {
  const { displayId, slideId, layers } = action.payload
  try {
    yield call(request, `${api.display}/${displayId}/slides/${slideId}/widgets`, {
      method: 'put',
      data: layers
    })
    yield put(displayLayersEdited(layers))
  } catch (err) {
    yield put(editDisplayLayersFail())
    message.error(err)
  }
}

export function* deleteDisplayLayers (action) {
  const { displayId, slideId, ids } = action.payload
  try {
    yield call(request, `${api.display}/${displayId}/slides/${slideId}/widgets`, {
      method: 'delete',
      data: ids
    })
    yield put(displayLayersDeleted(ids))
  } catch (err) {
    yield put(deleteDisplayLayersFail())
    message.error('当前 Display 删除图层失败，请稍后再试')
  }
}

export function* pasteSlideLayers (action) {
  const { displayId, slideId, layers } = action.payload
  try {
    const asyncData = yield call(request, `${api.display}/${displayId}/slides/${slideId}/widgets`, {
      method: 'post',
      data: layers
    })
    const result = readListAdapter(asyncData)
    yield put(slideLayersPasted(result))
    return result
  } catch (err) {
    yield put(pasteSlideLayersFail())
    message.error('当前 Display 粘贴图层失败，请稍后再试')
  }
}

export function* getDisplayShareLink (action) {
  const { id, authName } = action.payload
  try {
    const asyncData = yield call(request, {
      method: 'get',
      url: `${api.display}/${id}/share`,
      params: { username: authName }
    })
    const shareInfo = readListAdapter(asyncData)
    if (authName) {
      yield put(displaySecretLinkLoaded(shareInfo))
    } else {
      yield put(displayShareLinkLoaded(shareInfo))
    }
  } catch (err) {
    yield put(loadDisplayShareLinkFail())
    message.error('获取 Display 分享链接失败，请稍后再试')
  }
}

export function* undoOperation (action) {
}

export function* redoOperation (action) {
}

export default function* rootDisplaySaga (): IterableIterator<any> {
  yield [
    takeLatest(ActionTypes.LOAD_DISPLAYS, getDisplays),
    takeEvery(ActionTypes.ADD_DISPLAY, addDisplay),
    takeLatest(ActionTypes.LOAD_DISPLAY_DETAIL, getDisplayDetail),
    takeEvery(ActionTypes.EDIT_DISPLAY, editDisplay),
    takeEvery(ActionTypes.EDIT_CURRENT_DISPLAY, editCurrentDisplay),
    takeEvery(ActionTypes.EDIT_CURRENT_SLIDE, editCurrentSlide),
    takeEvery(ActionTypes.UPLOAD_CURRENT_SLIDE_COVER, uploadCurrentSlideCover),
    takeEvery(ActionTypes.DELETE_DISPLAY, deleteDisplay),
    takeEvery(ActionTypes.ADD_DISPLAY_LAYERS, addDisplayLayers),
    takeEvery(ActionTypes.EDIT_DISPLAY_LAYERS, editDisplayLayers),
    takeEvery(ActionTypes.DELETE_DISPLAY_LAYERS, deleteDisplayLayers),
    takeEvery(ActionTypes.PASTE_SLIDE_LAYERS, pasteSlideLayers),
    takeLatest(ActionTypes.LOAD_DISPLAY_SHARE_LINK, getDisplayShareLink),
    takeEvery(ActionTypes.UNDO_OPERATION, undoOperation),
    takeEvery(ActionTypes.REDO_OPERATION, redoOperation)
  ]
}
