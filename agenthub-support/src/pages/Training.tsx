import React from 'react';
import { PlayCircle, BookOpen, Award, Clock, ChevronRight } from 'lucide-react';

export function Training() {
  const courses = [
    {
      id: 1,
      title: 'POS System Fundamentals',
      description: 'Learn the basics of operating the point-of-sale system',
      duration: '45 mins',
      progress: 100,
      status: 'completed'
    },
    {
      id: 2,
      title: 'Inventory Management Best Practices',
      description: 'Master inventory tracking and ordering procedures',
      duration: '1.5 hours',
      progress: 60,
      status: 'in_progress'
    },
    {
      id: 3,
      title: 'Customer Service Excellence',
      description: 'Deliver exceptional customer experiences',
      duration: '2 hours',
      progress: 0,
      status: 'not_started'
    },
    {
      id: 4,
      title: 'Food Safety and Compliance',
      description: 'Essential food safety regulations and procedures',
      duration: '1 hour',
      progress: 100,
      status: 'completed'
    }
  ];

  const resources = [
    { title: 'Employee Handbook 2025', type: 'PDF', size: '2.3 MB' },
    { title: 'Store Operations Manual', type: 'PDF', size: '5.1 MB' },
    { title: 'Marketing Guidelines', type: 'PDF', size: '1.8 MB' },
    { title: 'Safety Procedures', type: 'Video', size: '124 MB' }
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Training & Resources</h1>
        <p className="text-gray-600">Complete courses and access training materials</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <Award className="h-8 w-8 text-indigo-600" />
            <span className="text-2xl font-bold">2</span>
          </div>
          <p className="text-sm text-gray-600">Courses Completed</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold">1</span>
          </div>
          <p className="text-sm text-gray-600">In Progress</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="h-8 w-8 text-green-600" />
            <span className="text-2xl font-bold">5.5</span>
          </div>
          <p className="text-sm text-gray-600">Hours Completed</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <Award className="h-8 w-8 text-yellow-600" />
            <span className="text-2xl font-bold">85%</span>
          </div>
          <p className="text-sm text-gray-600">Average Score</p>
        </div>
      </div>

      {/* Courses */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Courses</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((course) => (
            <div key={course.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{course.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{course.description}</p>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-1" />
                    {course.duration}
                  </div>
                </div>
                <PlayCircle className="h-8 w-8 text-indigo-600 flex-shrink-0 ml-4" />
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{course.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      course.status === 'completed' ? 'bg-green-600' :
                      course.status === 'in_progress' ? 'bg-blue-600' :
                      'bg-gray-300'
                    }`}
                    style={{ width: `${course.progress}%` }}
                  ></div>
                </div>
              </div>
              
              <button className={`mt-4 w-full px-4 py-2 rounded-lg text-sm font-medium ${
                course.status === 'completed'
                  ? 'bg-green-100 text-green-700'
                  : course.status === 'in_progress'
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
                {course.status === 'completed' ? '✓ Completed' :
                 course.status === 'in_progress' ? 'Continue' : 'Start Course'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Resources */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Quick Resources</h2>
        </div>
        <div className="divide-y">
          {resources.map((resource) => (
            <button
              key={resource.title}
              className="w-full px-6 py-4 hover:bg-gray-50 flex items-center justify-between"
            >
              <div className="flex items-center">
                <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-4">
                  {resource.type === 'PDF' ? '📄' : '🎥'}
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">{resource.title}</h3>
                  <p className="text-sm text-gray-500">{resource.type} • {resource.size}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}