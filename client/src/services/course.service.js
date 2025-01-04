import axios from "axios";
const API_URL = "https://mern.leinotek.com/api/courses";
// const API_URL = "http://localhost:8080/api/courses";
class CourseService {
  postCourse(title, description, price) {
    return axios.post(
      API_URL,
      { title, description, price },
      {
        headers: {
          Authorization: this.getToken(),
        },
      }
    );
  }

  getCourseByStudent(_id) {
    return axios.get(API_URL + "/student/" + _id, {
      headers: {
        Authorization: this.getToken(),
      },
    });
  }

  getCourseByInstructor(_id) {
    return axios.get(API_URL + "/instructor/" + _id, {
      headers: {
        Authorization: this.getToken(),
      },
    });
  }

  getCourseByName(name) {
    return axios.get(API_URL + "/findByName/" + name, {
      headers: {
        Authorization: this.getToken(),
      },
    });
  }

  enroll(_id) {
    return axios.post(
      API_URL + "/enroll",
      { _id },
      {
        headers: {
          Authorization: this.getToken(),
        },
      }
    );
  }

  getToken() {
    let token;
    if (localStorage.getItem("user")) {
      token = JSON.parse(localStorage.getItem("user")).token;
    } else {
      token = "";
    }
    return token;
  }
}

export default new CourseService();
