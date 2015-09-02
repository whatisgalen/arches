'''
ARCHES - a program developed to inventory and manage immovable cultural heritage.
Copyright (C) 2013 J. Paul Getty Trust and World Monuments Fund

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
'''

"""
This file demonstrates writing tests using the unittest module. These will pass
when you run "manage.py test".

Replace this with more appropriate tests for your application.
"""

import os
from tests.test_settings import DAY,MONTH,FOUR_DIGIT_YEAR,YEAR,ERA,SEP
from django.test import SimpleTestCase, TestCase
from arches.app.models.entity import Entity
from arches.app.models.resource import Resource
from arches.app.utils.betterJSONSerializer import JSONSerializer, JSONDeserializer

# these tests can be run from the command line via
# python manage.py test tests --pattern="*.py" --settings="tests.test_settings"

resource = Resource()
class DayFirstDateTests(SimpleTestCase):

    filters = [
        [DAY,MONTH,FOUR_DIGIT_YEAR,ERA],
        [DAY,MONTH,FOUR_DIGIT_YEAR+ERA],
        [DAY,MONTH,FOUR_DIGIT_YEAR],
        [r'(\s|^)'+YEAR,ERA],
        [r'(\s|^)'+YEAR+ERA],
        [r'(\s|\s-|^)'+YEAR+r'(\s|$)'],
    ]

    def test_slash_separated_date(self):
        """ test for 12/10/2003 """
        res = resource.parse_date_for_search('12/10/2003', filters=self.filters)
        self.assertEqual(res['day'], 12)
        self.assertEqual(res['month'], 10)
        self.assertEqual(res['year'], 2003)
        self.assertEqual(res['era'], 1)

    def test_slash_separated_date_with_era(self):
        """ test for 12/10/2003 BCE """
        res = resource.parse_date_for_search('12/10/2003 BCE', filters=self.filters)
        self.assertEqual(res['day'], 12)
        self.assertEqual(res['month'], 10)
        self.assertEqual(res['year'], 2003)
        self.assertEqual(res['era'], 0)

    def test_dash_separated_date_with_era(self):
        """ test for 12-10-2003 AD """
        res = resource.parse_date_for_search('12-10-2003 AD', filters=self.filters)
        self.assertEqual(res['day'], 12)
        self.assertEqual(res['month'], 10)
        self.assertEqual(res['year'], 2003)
        self.assertEqual(res['era'], 1)

    def test_dot_separated_date_with_era(self):
        """ test for 12.10.2003 BC """
        res = resource.parse_date_for_search('12.10.2003 BC', filters=self.filters)
        self.assertEqual(res['day'], 12)
        self.assertEqual(res['month'], 10)
        self.assertEqual(res['year'], 2003)
        self.assertEqual(res['era'], 0)

    def test_dot_separated_date_with_alt_era(self):
        """ test for 12.10.2003 ACE """
        res = resource.parse_date_for_search('12.10.2003 ACE', filters=self.filters)
        self.assertEqual(res['day'], 12)
        self.assertEqual(res['month'], 10)
        self.assertEqual(res['year'], 2003)
        self.assertEqual(res['era'], 1)

    def test_invalid_day_value(self):
        """ test for invalid date of 41-10-2003 AD """
        res = resource.parse_date_for_search('41-10-2003 AD', filters=self.filters)
        self.assertEqual(res['day'], None)
        self.assertEqual(res['month'], None)
        self.assertEqual(res['year'], None)
        self.assertEqual(res['era'], None)

    def test_invalid_month_value(self):
        """ test for invalid date of 4-39-2003 AD """
        res = resource.parse_date_for_search('4-39-2003 AD', filters=self.filters)
        self.assertEqual(res['day'], None)
        self.assertEqual(res['month'], None)
        self.assertEqual(res['year'], None)
        self.assertEqual(res['era'], None)

    def test_date_embedded_in_string(self):
        """ test for date in the string 'The date was 12-10-2003 AD' """
        res = resource.parse_date_for_search('The date was 12-10-2003 AD', filters=self.filters)
        self.assertEqual(res['day'], 12)
        self.assertEqual(res['month'], 10)
        self.assertEqual(res['year'], 2003)
        self.assertEqual(res['era'], 1)

    def test_for_era_next_to_year_wo_any_space(self):
        """ test for era next to year without space 12-10-2003BC """
        res = resource.parse_date_for_search('12-10-2003BC', filters=self.filters)
        self.assertEqual(res['day'], 12)
        self.assertEqual(res['month'], 10)
        self.assertEqual(res['year'], 2003)
        self.assertEqual(res['era'], 0)

    def test_textual_date_string(self):
        """ test 'on the 9th of January 2003' """
        res = resource.parse_date_for_search('on the 9th of January 2003', filters=self.filters)
        self.assertEqual(res['day'], None)
        self.assertEqual(res['month'], None)
        self.assertEqual(res['year'], 2003)
        self.assertEqual(res['era'], 1)

    def test_year(self):
        """ test '2003' """
        res = resource.parse_date_for_search('2003', filters=self.filters)
        self.assertEqual(res['day'], None)
        self.assertEqual(res['month'], None)
        self.assertEqual(res['year'], 2003)
        self.assertEqual(res['era'], 1)

    def test_ancient_year(self):
        """ test '10000 BC' """
        res = resource.parse_date_for_search('10000 BC', filters=self.filters)
        self.assertEqual(res['day'], None)
        self.assertEqual(res['month'], None)
        self.assertEqual(res['year'], 10000)
        self.assertEqual(res['era'], 0)

    def test_ancient_year_using_negative_prefix(self):
        """ test '-10000' """
        res = resource.parse_date_for_search('-10000', filters=self.filters)
        self.assertEqual(res['day'], None)
        self.assertEqual(res['month'], None)
        self.assertEqual(res['year'], 10000)
        self.assertEqual(res['era'], 0)


class MonthFirstDateTests(SimpleTestCase):

    filters = [
        [MONTH,DAY,FOUR_DIGIT_YEAR,ERA],
        [MONTH,DAY,FOUR_DIGIT_YEAR],
    ]

    def test_1(self):
        """ test for 12/28/2003 """
        res = resource.parse_date_for_search('12/28/2003', filters=self.filters)
        self.assertEqual(res['day'], 28)
        self.assertEqual(res['month'], 12)
        self.assertEqual(res['year'], 2003)
        self.assertEqual(res['era'], 1)

    def test_2(self):
        """ test for 12/28/2003 BCE """
        res = resource.parse_date_for_search('12/28/2003 BCE', filters=self.filters)
        self.assertEqual(res['day'], 28)
        self.assertEqual(res['month'], 12)
        self.assertEqual(res['year'], 2003)
        self.assertEqual(res['era'], 0)

    def test_3(self):
        """ test for 12-28-2003 AD """
        res = resource.parse_date_for_search('12-28-2003 AD', filters=self.filters)
        self.assertEqual(res['day'], 28)
        self.assertEqual(res['month'], 12)
        self.assertEqual(res['year'], 2003)
        self.assertEqual(res['era'], 1)

    def test_4(self):
        """ test for invalid date of 41-28-2003 AD """
        res = resource.parse_date_for_search('41-28-2003 AD', filters=self.filters)
        self.assertEqual(res['day'], None)
        self.assertEqual(res['month'], None)
        self.assertEqual(res['year'], None)
        self.assertEqual(res['era'], None)

    def test_5(self):
        """ test for date of 12-28-2003 AD embedded in a string """
        res = resource.parse_date_for_search('The date was 12-28-2003 AD', filters=self.filters)
        self.assertEqual(res['day'], 28)
        self.assertEqual(res['month'], 12)
        self.assertEqual(res['year'], 2003)
        self.assertEqual(res['era'], 1)

    def test_6(self):
        """ test for 8-5-1971 """
        res = resource.parse_date_for_search('8-5-1971', filters=self.filters)
        self.assertEqual(res['day'], 5)
        self.assertEqual(res['month'], 8)
        self.assertEqual(res['year'], 1971)
        self.assertEqual(res['era'], 1)

    def test_7(self):
        """ test for invalid date of 41-28-2003 AD """
        res = resource.parse_date_for_search('41-28-2003 AD', filters=self.filters)
        self.assertEqual(res['day'], None)
        self.assertEqual(res['month'], None)
        self.assertEqual(res['year'], None)
        self.assertEqual(res['era'], None)


class YearFirstDateTests(SimpleTestCase):

    filters = [
        [FOUR_DIGIT_YEAR,MONTH,DAY,ERA],
        [FOUR_DIGIT_YEAR,MONTH,DAY],
        [r'(\s|^)'+YEAR,ERA],
        [r'(\s|^)'+YEAR+ERA],
        [r'(\s|\s-|^)'+YEAR+r'(\s|$)'],
    ]

    def test_date_time_sting(self):
        """ test '2015-07-02 10:59:00' """
        res = resource.parse_date_for_search('2015-07-02 10:59:00', filters=self.filters)
        self.assertEqual(res['day'], 2)
        self.assertEqual(res['month'], 7)
        self.assertEqual(res['year'], 2015)
        self.assertEqual(res['era'], 1)

    def test_iso_date_sting(self):
        """ test '2007-03-01T13:00:00Z' """
        res = resource.parse_date_for_search('2007-03-01T13:00:00Z', filters=self.filters)
        self.assertEqual(res['day'], 1)
        self.assertEqual(res['month'], 3)
        self.assertEqual(res['year'], 2007)
        self.assertEqual(res['era'], 1)
